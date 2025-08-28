import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const ConfigSchema = z.object({
  BACKEND_PORT: z.coerce.number().default(3001),
  CORS_ORIGIN: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

let cached: Config | null = null;

export function getConfig(): Config {
  if (cached) return cached;
  const parsed = ConfigSchema.parse({
    BACKEND_PORT: process.env.BACKEND_PORT ?? 3001,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
  });
  cached = parsed;
  return parsed;
}

