import { z } from 'zod';

const EnvSchema = z.object({
  // Server configuration
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default('0.0.0.0'),

  // Radio configuration
  RIGCTLD_HOST: z.string().ip().default('127.0.0.1'),
  RIGCTLD_PORT: z.coerce.number().int().positive().default(4532),

  // Audio configuration
  AUDIO_ENABLED: z.coerce.boolean().default(true),
  AUDIO_SAMPLE_RATE: z.coerce.number().int().positive().default(48000),
  AUDIO_BUFFER_SIZE: z.coerce.number().int().positive().default(1024),

  // Cross-network configuration
  CORS_ORIGIN: z.string().default('*'),
  FRONTEND_URL: z.string().url().optional(),

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),

  // Development
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Config = z.infer<typeof EnvSchema>;

function loadConfig(): Config {
  try {
    return EnvSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment configuration:');
      error.errors.forEach(err => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

export const config = loadConfig();

// Log configuration on startup
console.log('🔧 Configuration loaded:');
console.log(`  Server: ${config.HOST}:${config.PORT}`);
console.log(`  Rigctld: ${config.RIGCTLD_HOST}:${config.RIGCTLD_PORT}`);
console.log(`  Audio: ${config.AUDIO_ENABLED ? 'enabled' : 'disabled'}`);
console.log(`  Environment: ${config.NODE_ENV}`);