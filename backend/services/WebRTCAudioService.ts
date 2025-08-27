import type { Server as SocketIOServer, Socket } from 'socket.io';
import { ChildProcess, spawn } from 'child_process';

// Minimal, safe, optional WebRTC audio service. It enables RX/TX once the
// environment provides wrtc and system audio tools. If unavailable, it stays
// disabled without breaking the server.

export class WebRTCAudioService {
  private io: SocketIOServer;
  private available = false;
  private wrtc: any | null = null;
  private pcs = new Map<string, RTCPeerConnection>();
  // Placeholders for future device bridges
  private rxProcs = new Map<string, ChildProcess>(); // per-client arecord/ffmpeg -> RTCAudioSource
  private rxSources = new Map<string, any>(); // per-client RTCAudioSource
  private txProc: ChildProcess | null = null; // RTCAudioSink -> aplay/ffmpeg
  private txEnabled = false;

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  async init(): Promise<void> {
    try {
      // Dynamic import so missing wrtc does not crash startup
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.wrtc = await import('wrtc');
      this.available = true;
      // eslint-disable-next-line no-console
      console.log('[WebRTCAudioService] wrtc available');
    } catch (err) {
      this.available = false;
      console.warn('[WebRTCAudioService] wrtc not available; audio transport disabled');
    }
  }

  isAvailable(): boolean { return this.available; }

  attachNamespace(): void {
    const nsp = this.io.of('/webrtc');
    nsp.on('connection', (socket: Socket) => {
      // eslint-disable-next-line no-console
      console.log('[WebRTC] client connected', socket.id);

      socket.emit('server-capabilities', { available: this.available });

      socket.on('client-offer', async (offer: RTCSessionDescriptionInit) => {
        if (!this.available) {
          socket.emit('webrtc-error', { message: 'WebRTC unavailable on server' });
          return;
        }
        try {
          const answer = await this.handleClientOffer(socket.id, offer);
          socket.emit('server-answer', answer);
        } catch (e: any) {
          socket.emit('webrtc-error', { message: e?.message || 'Offer handling failed' });
        }
      });

      socket.on('client-ice', async (candidate: RTCIceCandidateInit) => {
        const pc = this.pcs.get(socket.id) as any;
        if (!pc) return;
        try { await pc.addIceCandidate(candidate); } catch {}
      });

      socket.on('disconnect', () => {
        const pc = this.pcs.get(socket.id) as any;
        if (pc) {
          try { pc.close(); } catch {}
          this.pcs.delete(socket.id);
        }
      });
    });
  }

  async handleClientOffer(clientId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    const { RTCPeerConnection } = this.wrtc;
    const pc: RTCPeerConnection = new RTCPeerConnection({
      sdpSemantics: 'unified-plan',
      iceServers: []
    } as any);

    // For now, request a recvonly audio transceiver so we can send RX audio later
    pc.addTransceiver('audio', { direction: 'sendrecv' });

    pc.onicecandidate = (ev: any) => {
      if (ev.candidate) {
        this.io.of('/webrtc').to(clientId).emit('server-ice', ev.candidate);
      }
    };

    pc.onconnectionstatechange = () => {
      // eslint-disable-next-line no-console
      console.log('[WebRTC] pc state:', pc.connectionState);
    };

    // Placeholder: when we receive client mic, we could attach a sink here.
    pc.ontrack = (ev: any) => {
      // eslint-disable-next-line no-console
      console.log('[WebRTC] ontrack kind=', ev.track?.kind);
      // TODO: route ev.track to audio sink (aplay/ffmpeg) when txEnabled
    };

    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // After setting descriptions, start RX capture for this client
    try { await this.startRxForClient(clientId, pc); } catch (e) { console.warn('[WebRTC] RX start failed:', e); }

    this.pcs.set(clientId, pc);
    return pc.localDescription as RTCSessionDescriptionInit;
  }

  // Start RX for a client: attach an RTCAudioSource track and feed it
  private async startRxForClient(clientId: string, pc: RTCPeerConnection): Promise<void> {
    if (!this.available) return;
    const nonstandard = this.wrtc?.nonstandard;
    if (!nonstandard?.RTCAudioSource) {
      console.warn('[WebRTC] RTCAudioSource unavailable');
      return;
    }

    if (this.rxSources.has(clientId)) return; // already started

    const audioSource = new nonstandard.RTCAudioSource();
    const track = audioSource.createTrack();
    pc.addTrack(track);

    this.rxSources.set(clientId, audioSource);

    // For now, generate silence frames (environment-safe). Replace with ffmpeg capture on Pi.
    const sampleRate = 48000;
    const channelCount = 1;
    const frameSize = 480; // 10ms @ 48kHz
    const bitsPerSample = 16;
    const samples = new Int16Array(frameSize * channelCount);

    const pushSilence = () => {
      if (!this.rxSources.has(clientId)) return;
      try {
        audioSource.onData({
          samples,
          sampleRate,
          bitsPerSample,
          channelCount,
          numberOfFrames: frameSize,
        });
      } catch {}
    };

    const timer = setInterval(pushSilence, 10);

    // Cleanup on PC close or client disconnect
    const stop = () => {
      clearInterval(timer);
      try { (track as any).stop?.(); } catch {}
      this.rxSources.delete(clientId);
      const rxp = this.rxProcs.get(clientId);
      if (rxp) {
        try { rxp.kill('SIGTERM'); } catch {}
        this.rxProcs.delete(clientId);
      }
    };

    (pc as any).onconnectionstatechange = () => {
      if (pc.connectionState === 'closed' || pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        stop();
      }
    };
  }

  setTxEnabled(enabled: boolean) {
    this.txEnabled = enabled;
    // TODO: gate sink write/mute; coordinate with rigctl PTT in server.ts
  }
}

