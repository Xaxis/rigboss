import { z } from "zod";

export const RadioModeEnum = z.enum([
  "LSB",
  "USB",
  "AM",
  "CW",
  "RTTY",
  "FM",
  "WFM",
  "CWR",
  "DIGL",
  "DIGU",
  "PKTLSB",
  "PKTUSB",
  "PKTFM",
  "ECSSLSB",
  "ECSSUSB",
  "FAX",
  "SAM",
  "SAL",
  "SAH",
  "DSB",
  "CWU",
  "NONE",
]);
export type RadioMode = z.infer<typeof RadioModeEnum>;

export const RadioStateSchema = z.object({
  connected: z.boolean(),
  rigModel: z.string().optional(),
  frequencyHz: z.number().optional(),
  mode: RadioModeEnum.optional(),
  bandwidthHz: z.number().optional(),
  power: z.number().optional(),
  ptt: z.boolean().optional(),
});
export type RadioState = z.infer<typeof RadioStateSchema>;

export const AudioStatusSchema = z.object({
  started: z.boolean(),
  mode: z.enum(["webrtc", "pcm", "none"]).default("none"),
});
export type AudioStatus = z.infer<typeof AudioStatusSchema>;

export const SpectrumSettingsSchema = z.object({
  centerHz: z.number(),
  spanHz: z.number(),
  fftSize: z.number(),
  averaging: z.number().min(1).max(10).default(1),
  refLevel: z.number().default(0),
  colorMap: z.string().default("viridis"),
});
export type SpectrumSettings = z.infer<typeof SpectrumSettingsSchema>;

export const SpectrumFrameSchema = z.object({
  timestamp: z.number(),
  startHz: z.number(),
  binSizeHz: z.number(),
  db: z.array(z.number()),
});
export type SpectrumFrame = z.infer<typeof SpectrumFrameSchema>;

