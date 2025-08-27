import { io, Socket } from 'socket.io-client';

export type AudioEngineEvents = {
  onAvailable?: (available: boolean) => void;
  onConnected?: () => void;
  onError?: (message: string) => void;
};

// Minimal front-end engine for signaling and media wiring.
export class AudioEngine {
  private socket: Socket | null = null;
  private pc: RTCPeerConnection | null = null;
  private remoteAudioEl: HTMLAudioElement | null = null;
  private events: AudioEngineEvents;

  constructor(events: AudioEngineEvents = {}) {
    this.events = events;
  }

  attachOutputElement(el: HTMLAudioElement) {
    this.remoteAudioEl = el;
  }

  async start(signalingUrl = 'http://localhost:3001/webrtc'): Promise<void> {
    // Socket.IO namespace used only for signaling
    this.socket = io(signalingUrl, { path: '/socket.io' });

    await new Promise<void>((resolve, reject) => {
      this.socket!.on('connect', () => resolve());
      this.socket!.on('connect_error', reject);
    });

    this.socket.on('server-capabilities', (cap: { available: boolean }) => {
      this.events.onAvailable?.(cap.available);
    });

    this.socket.on('server-answer', async (answer: RTCSessionDescriptionInit) => {
      if (!this.pc) return;
      await this.pc.setRemoteDescription(answer);
      this.events.onConnected?.();
    });

    this.socket.on('server-ice', async (cand: RTCIceCandidateInit) => {
      if (!this.pc) return;
      try { await this.pc.addIceCandidate(cand); } catch {}
    });

    this.socket.on('webrtc-error', (e: { message: string }) => {
      this.events.onError?.(e.message);
    });

    await this.createOffer();
  }

  async stop(): Promise<void> {
    try { this.pc?.close(); } catch {}
    this.pc = null;
    if (this.socket?.connected) this.socket.disconnect();
    this.socket = null;
  }

  async createOffer(): Promise<void> {
    this.pc = new RTCPeerConnection({});
    this.pc.onicecandidate = (ev) => {
      if (ev.candidate) this.socket?.emit('client-ice', ev.candidate);
    };
    this.pc.ontrack = (ev) => {
      if (this.remoteAudioEl) {
        this.remoteAudioEl.srcObject = ev.streams[0] ?? new MediaStream([ev.track]);
        this.remoteAudioEl.play().catch(() => {/* user gesture might be required */});
      }
    };

    const offer = await this.pc.createOffer({ offerToReceiveAudio: true });
    await this.pc.setLocalDescription(offer);
    this.socket?.emit('client-offer', offer);
  }

  async setOutputDevice(deviceId: string | null) {
    if (!this.remoteAudioEl) return;
    // @ts-ignore - setSinkId is not in lib.dom.d.ts everywhere
    if (typeof this.remoteAudioEl.setSinkId === 'function') {
      try { await (this.remoteAudioEl as any).setSinkId(deviceId || 'default'); } catch {}
    }
  }
}

