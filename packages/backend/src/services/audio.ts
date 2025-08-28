import { EventEmitter } from "node:events";
import type { AudioStatus } from "../dtos.js";
import { EVENTS } from "../events.js";

export interface AudioServiceOptions {
  // future: encoder, device selectors, etc.
}

export class AudioService extends EventEmitter {
  private status: AudioStatus = { started: false, mode: "none" };

  startPCM() {
    this.status = { started: true, mode: "pcm" };
    this.emit(EVENTS.AUDIO_STATUS, this.status);
  }

  startWebRTC() {
    this.status = { started: true, mode: "webrtc" };
    this.emit(EVENTS.AUDIO_STATUS, this.status);
  }

  stop() {
    this.status = { started: false, mode: "none" };
    this.emit(EVENTS.AUDIO_STATUS, this.status);
  }

  getStatus(): AudioStatus {
    return this.status;
  }
}

