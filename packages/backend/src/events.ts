export const EVENTS = {
  RADIO_STATE: 'radio_state',
  CONNECTION_STATUS: 'connection_status',
  RADIO_CAPS: 'radio_caps',
  SPECTRUM_FRAME: 'spectrum_frame', // Phase 2
  AUDIO_STATUS: 'audio_status', // Phase 2
} as const;

export type EventName = typeof EVENTS[keyof typeof EVENTS];

