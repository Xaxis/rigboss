import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const EnvSchema = z.object({
  BACKEND_PORT: z.coerce.number().int().positive().default(3001),
  USE_REAL_RADIO: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .default('true' as any),
  RIGCTLD_HOST: z.string().default('127.0.0.1'),
  RIGCTLD_PORT: z.coerce.number().int().positive().default(4532),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().optional(), // comma-separated allowlist or * in dev
});

export type AppConfig = z.infer<typeof EnvSchema> & {
  corsOrigins: string[] | '*';
};

export function loadConfig(): AppConfig {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('Invalid environment variables:', parsed.error.flatten());
    throw new Error('Invalid environment variables');
  }
  const base = parsed.data;
  const cors = base.CORS_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean);
  const corsOrigins = base.NODE_ENV === 'development' ? (cors && cors.length > 0 ? cors : '*') : (cors && cors.length > 0 ? cors : []);
  return { ...base, corsOrigins } as AppConfig;
}

