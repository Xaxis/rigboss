import { io, Socket } from 'socket.io-client';

/**
 * Headless PCM tap that connects to the /audio namespace to receive RX PCM
 * samples for spectrum rendering without starting audible playback.
 */
export class AudioSpectrumTap {
  private socket: Socket | null = null;
  private connected = false;

  async connect() {
    if (this.connected) return;
    const host = window.location.hostname;
    const url = host === 'localhost' || host === '127.0.0.1' ? 'http://localhost:3001/audio' : `http://${host}:3001/audio`;
    this.socket = io(url, { path: '/socket.io' });

    await new Promise<void>((resolve) => {
      this.socket!.once('connect', () => {
        // Proactively request audio start on connect
        try { this.socket?.emit('start-audio'); } catch {}
        resolve();
      });
    });

    // Also respond to capability broadcast
    this.socket.on('server-capabilities', (cap: { available: boolean }) => {
      if (cap.available) {
        this.socket?.emit('start-audio');
      }
    });

    this.socket.on('audio-data', (audioData: ArrayBuffer) => {
      // Convert to Float32 and emit a browser event for the PcmIngestor
      const s16 = new Int16Array(audioData);
      const f32 = new Float32Array(s16.length);
      for (let i = 0; i < s16.length; i++) f32[i] = s16[i] / 32768.0;
      try {
        window.dispatchEvent(new CustomEvent('pcm-samples', { detail: { samples: f32, sampleRate: 48000 } }));
      } catch {}
    });

    this.connected = true;
  }
}

