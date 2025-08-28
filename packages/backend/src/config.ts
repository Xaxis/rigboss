import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const ConfigSchema = z.object({
  BACKEND_PORT: z.coerce.number().default(3001),
  CORS_ORIGIN: z.string().optional(),

  // Radio Configuration
  USE_REAL_RADIO: z.string().default('false'),
  RIG_MODEL: z.coerce.number().default(3085),
  RIG_PORT: z.string().default('/dev/ttyUSB0'),
  RIG_SPEED: z.coerce.number().default(19200),

  // Logging
  LOG_LEVEL: z.string().default('info'),
  NODE_ENV: z.string().default('development'),
});

export type Config = z.infer<typeof ConfigSchema>;

let cached: Config | null = null;

export function getConfig(): Config {
  if (cached) return cached;
  const parsed = ConfigSchema.parse({
    BACKEND_PORT: process.env.BACKEND_PORT ?? 3001,
    CORS_ORIGIN: process.env.CORS_ORIGIN,

    // Radio Configuration
    USE_REAL_RADIO: process.env.USE_REAL_RADIO ?? 'false',
    RIG_MODEL: process.env.RIG_MODEL ?? 3085,
    RIG_PORT: process.env.RIG_PORT ?? '/dev/ttyUSB0',
    RIG_SPEED: process.env.RIG_SPEED ?? 19200,

    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
    NODE_ENV: process.env.NODE_ENV ?? 'development',
  });
  cached = parsed;
  return parsed;
}

