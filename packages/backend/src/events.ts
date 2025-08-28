export const EVENTS = {
  RADIO_STATE: "radio_state",
  CONNECTION_STATUS: "connection_status",
  SPECTRUM_FRAME: "spectrum_frame",
  SERVICE_STATUS_CHANGED: "service_status_changed",
  AUDIO_STATUS: "audio_status",
  SPECTRUM_SETTINGS_CHANGED: "spectrum_settings_changed",
} as const;
export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

