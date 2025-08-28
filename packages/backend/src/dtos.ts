import { z } from 'zod';

export const RadioStateSchema = z.object({
  connected: z.boolean(),
  frequencyHz: z.number().nonnegative().optional().default(0),
  mode: z.string().optional().default(''),
  bandwidthHz: z.number().int().positive().optional(),
  power: z.number().min(0).max(100).optional(),
  ptt: z.boolean().optional(),
  rigModel: z.string().optional(),
  swr: z.number().nonnegative().optional(),
  signalStrength: z.number().optional(),
});

export type RadioState = z.infer<typeof RadioStateSchema>;

export const ConnectPayloadSchema = z.object({
  host: z.string().ip().optional(),
  port: z.number().int().positive().optional(),
});
export type ConnectPayload = z.infer<typeof ConnectPayloadSchema>;

export const SetFrequencyPayloadSchema = z.object({
  frequency: z.number().int().nonnegative(),
});
export type SetFrequencyPayload = z.infer<typeof SetFrequencyPayloadSchema>;

export const SetModePayloadSchema = z.object({
  mode: z.string(),
  bandwidthHz: z.number().int().positive().optional(),
});
export type SetModePayload = z.infer<typeof SetModePayloadSchema>;

export const SetPowerPayloadSchema = z.object({
  power: z.number().min(0).max(100),
});
export type SetPowerPayload = z.infer<typeof SetPowerPayloadSchema>;

export const SetPTTPayloadSchema = z.object({
  ptt: z.boolean(),
});
export type SetPTTPayload = z.infer<typeof SetPTTPayloadSchema>;

export const TunePayloadSchema = z.object({
  ms: z.number().int().min(100).max(5000).optional().default(1200),
});
export type TunePayload = z.infer<typeof TunePayloadSchema>;

