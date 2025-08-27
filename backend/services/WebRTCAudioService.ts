import type { Server as SocketIOServer, Socket } from 'socket.io';
import { ChildProcess, spawn } from 'child_process';
import { platform } from 'os';

// Cross-platform audio service using WebSocket + raw audio instead of WebRTC
// Works on Linux (ALSA), macOS (CoreAudio), Windows (DirectSound) via ffmpeg

export class WebRTCAudioService {
  private io: SocketIOServer;
  private available = false;
  private rxProcs = new Map<string, ChildProcess>(); // per-client audio capture
  private txProc: ChildProcess | null = null; // audio playback
  private txEnabled = false;
  private audioClients = new Set<string>(); // track connected audio clients

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  async init(): Promise<void> {
    // Check if ffmpeg is available (cross-platform audio tool)
    try {
      const ffmpegCheck = spawn('ffmpeg', ['-version'], { stdio: 'pipe' });
      await new Promise((resolve, reject) => {
        ffmpegCheck.on('close', (code) => {
          if (code === 0) {
            this.available = true;
            console.log('[AudioService] ffmpeg available - audio streaming enabled');
            resolve(true);
          } else {
            reject(new Error('ffmpeg not found'));
          }
        });
        ffmpegCheck.on('error', reject);
      });
    } catch (err) {
      this.available = false;
      console.warn('[AudioService] ffmpeg not available; audio transport disabled');
      console.warn('Install ffmpeg for audio streaming support');
    }
  }

  isAvailable(): boolean { return this.available; }

  attachNamespace(): void {
    const nsp = this.io.of('/audio');
    nsp.on('connection', (socket: Socket) => {
      console.log('[Audio] client connected', socket.id);

      socket.emit('server-capabilities', { available: this.available });

      socket.on('start-audio', async () => {
        if (!this.available) {
          socket.emit('audio-error', { message: 'Audio unavailable on server' });
          return;
        }
        try {
          await this.startRxForClient(socket.id, socket);
          this.audioClients.add(socket.id);
          socket.emit('audio-started');
        } catch (e: any) {
          socket.emit('audio-error', { message: e?.message || 'Audio start failed' });
        }
      });

      socket.on('stop-audio', () => {
        this.stopRxForClient(socket.id);
        this.audioClients.delete(socket.id);
      });

      socket.on('mic-data', (audioData: ArrayBuffer) => {
        if (this.txEnabled) {
          this.handleMicData(audioData).catch(console.error);
        }
      });

      socket.on('disconnect', () => {
        this.stopRxForClient(socket.id);
        this.audioClients.delete(socket.id);
      });
    });
  }

  private async getAudioInputDevice(): Promise<string> {
    const os = platform();
    switch (os) {
      case 'linux':
        // Try to detect available ALSA devices
        try {
          const { execSync } = await import('child_process');
          const output = execSync('arecord -l 2>/dev/null || echo "none"', { encoding: 'utf8' });

          console.log('[Audio] Available input devices:', output.trim());

          // Look for USB audio devices first (common for ham radios)
          const usbMatch = output.match(/card (\d+).*USB/i);
          if (usbMatch) {
            const device = `plughw:${usbMatch[1]},0`;
            console.log(`[Audio] Using USB input device: ${device}`);
            return device;
          }

          // Look for any audio device
          const cardMatch = output.match(/card (\d+)/);
          if (cardMatch) {
            const device = `plughw:${cardMatch[1]},0`;
            console.log(`[Audio] Using input device: ${device}`);
            return device;
          }

          console.log('[Audio] No specific devices found, using default');
          return 'default';
        } catch (error) {
          console.warn('[Audio] Device detection failed:', error);
          return 'default';
        }
      case 'darwin':
        return ':0'; // Default audio input on macOS
      case 'win32':
        return 'audio='; // DirectShow default
      default:
        return 'default';
    }
  }

  private async getAudioOutputDevice(): Promise<string> {
    const os = platform();
    switch (os) {
      case 'linux':
        // Try to detect available ALSA devices
        try {
          const { execSync } = await import('child_process');
          const output = execSync('aplay -l 2>/dev/null || echo "none"', { encoding: 'utf8' });

          console.log('[Audio] Available output devices:', output.trim());

          // Look for USB audio devices first (common for ham radios)
          const usbMatch = output.match(/card (\d+).*USB/i);
          if (usbMatch) {
            const device = `plughw:${usbMatch[1]},0`;
            console.log(`[Audio] Using USB output device: ${device}`);
            return device;
          }

          // Look for any audio device
          const cardMatch = output.match(/card (\d+)/);
          if (cardMatch) {
            const device = `plughw:${cardMatch[1]},0`;
            console.log(`[Audio] Using output device: ${device}`);
            return device;
          }

          console.log('[Audio] No specific devices found, using default');
          return 'default';
        } catch (error) {
          console.warn('[Audio] Device detection failed:', error);
          return 'default';
        }
      case 'darwin':
        return ':0'; // Default audio output on macOS
      case 'win32':
        return 'audio='; // DirectShow default
      default:
        return 'default';
    }
  }

  private async startRxForClient(clientId: string, socket: Socket): Promise<void> {
    if (!this.available) return;
    if (this.rxProcs.has(clientId)) return; // already started

    const inputDevice = await this.getAudioInputDevice();
    const os = platform();

    let ffmpegArgs: string[];

    if (os === 'linux') {
      // ALSA input -> raw PCM
      ffmpegArgs = [
        '-f', 'alsa',
        '-i', inputDevice,
        '-ar', '48000',
        '-ac', '1',
        '-f', 's16le',
        '-'
      ];
    } else if (os === 'darwin') {
      // AVFoundation input -> raw PCM
      ffmpegArgs = [
        '-f', 'avfoundation',
        '-i', inputDevice,
        '-ar', '48000',
        '-ac', '1',
        '-f', 's16le',
        '-'
      ];
    } else {
      // Windows DirectShow
      ffmpegArgs = [
        '-f', 'dshow',
        '-i', `audio=${inputDevice}`,
        '-ar', '48000',
        '-ac', '1',
        '-f', 's16le',
        '-'
      ];
    }

    const ffmpeg = spawn('ffmpeg', ffmpegArgs, { stdio: ['ignore', 'pipe', 'pipe'] });

    let hasStarted = false;
    let dataCount = 0;

    ffmpeg.stdout.on('data', (chunk: Buffer) => {
      if (!hasStarted) {
        hasStarted = true;
        console.log(`[Audio] RX stream started for client ${clientId}, receiving data`);
      }
      dataCount++;
      // Send raw PCM data to client via WebSocket
      socket.emit('audio-data', chunk);
    });

    ffmpeg.stderr.on('data', (data) => {
      const message = data.toString();
      // Only log actual errors, not version info
      if (message.includes('Error') || message.includes('error') || message.includes('failed') || message.includes('Input/output error')) {
        console.error('[Audio] ffmpeg error:', message.trim());
        // Notify client of audio error
        socket.emit('audio-error', { message: 'Audio capture failed - check device connection' });
      }
    });

    ffmpeg.on('close', (code) => {
      console.log(`[Audio] RX process closed with code ${code} (sent ${dataCount} chunks)`);
      this.rxProcs.delete(clientId);
      if (code !== 0) {
        socket.emit('audio-error', { message: 'Audio capture stopped unexpectedly' });
      }
    });

    ffmpeg.on('error', (error) => {
      console.error('[Audio] ffmpeg spawn error:', error);
      socket.emit('audio-error', { message: 'Failed to start audio capture' });
      this.rxProcs.delete(clientId);
    });

    this.rxProcs.set(clientId, ffmpeg);
    console.log(`[Audio] Started RX capture for client ${clientId} using device: ${inputDevice}`);
  }

  private stopRxForClient(clientId: string): void {
    const proc = this.rxProcs.get(clientId);
    if (proc) {
      try {
        proc.kill('SIGTERM');
      } catch (e) {
        console.warn('[Audio] Error stopping RX process:', e);
      }
      this.rxProcs.delete(clientId);
    }
  }

  private async handleMicData(audioData: ArrayBuffer): Promise<void> {
    if (!this.txEnabled || !this.available) return;

    // Start TX process if not already running
    if (!this.txProc) {
      await this.startTxProcess();
    }

    // Send mic data to TX process
    if (this.txProc && this.txProc.stdin) {
      try {
        this.txProc.stdin.write(Buffer.from(audioData));
      } catch (e) {
        console.warn('[Audio] Error writing to TX process:', e);
      }
    }
  }

  private async startTxProcess(): Promise<void> {
    if (this.txProc) return;

    const outputDevice = await this.getAudioOutputDevice();
    const os = platform();

    let ffmpegArgs: string[];

    if (os === 'linux') {
      // Raw PCM -> ALSA output
      ffmpegArgs = [
        '-f', 's16le',
        '-ar', '48000',
        '-ac', '1',
        '-i', '-',
        '-f', 'alsa',
        outputDevice
      ];
    } else if (os === 'darwin') {
      // Raw PCM -> AVFoundation output
      ffmpegArgs = [
        '-f', 's16le',
        '-ar', '48000',
        '-ac', '1',
        '-i', '-',
        '-f', 'avfoundation',
        outputDevice
      ];
    } else {
      // Raw PCM -> DirectShow output
      ffmpegArgs = [
        '-f', 's16le',
        '-ar', '48000',
        '-ac', '1',
        '-i', '-',
        '-f', 'dshow',
        `audio=${outputDevice}`
      ];
    }

    this.txProc = spawn('ffmpeg', ffmpegArgs, { stdio: ['pipe', 'ignore', 'pipe'] });

    this.txProc.stderr?.on('data', (data) => {
      console.warn('[Audio] TX ffmpeg stderr:', data.toString());
    });

    this.txProc.on('close', (code) => {
      console.log('[Audio] TX process closed with code', code);
      this.txProc = null;
    });

    console.log('[Audio] Started TX playback process');
  }

  setTxEnabled(enabled: boolean) {
    this.txEnabled = enabled;

    if (!enabled && this.txProc) {
      // Stop TX when PTT released
      try {
        this.txProc.kill('SIGTERM');
      } catch (e) {
        console.warn('[Audio] Error stopping TX process:', e);
      }
      this.txProc = null;
    }

    console.log('[Audio] TX enabled:', enabled);
  }
}

