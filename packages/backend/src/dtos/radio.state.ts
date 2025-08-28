import { z } from 'zod';

export const RadioStateSchema = z.object({
  connected: z.boolean(),
  // Frequency in Hz; frontend maps this to its own field
  frequencyHz: z.number().nonnegative().optional().default(0),
  mode: z.string().optional().default(''),
  bandwidthHz: z.number().int().positive().optional(),
  power: z.number().min(0).max(100).optional(),
  ptt: z.boolean().optional(),
  // Optional extended state for richer UX
  vfo: z.string().optional(),
  split: z.boolean().optional(),
  tuning: z.boolean().optional(),
  rigModel: z.string().optional(),
  serialNumber: z.string().optional(),
  firmwareVersion: z.string().optional(),
  swr: z.number().nonnegative().optional(),
  signalStrength: z.number().optional(),
});

export type RadioState = z.infer<typeof RadioStateSchema>;

