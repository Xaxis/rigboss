import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server as IOServer } from 'socket.io';
import { z } from 'zod';
import { RadioService } from './services/radio.js';

// Environment configuration
const ConfigSchema = z.object({
  BACKEND_PORT: z.coerce.number().default(3001),
  RIGCTLD_HOST: z.string().default('127.0.0.1'),
  RIGCTLD_PORT: z.coerce.number().default(4532),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:4321'),
});

const config = ConfigSchema.parse(process.env);
const corsOrigins = config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(',').map(s => s.trim());

// Events
export const EVENTS = {
  RADIO_STATE: 'radio_state',
  CONNECTION_STATUS: 'connection_status',
  RADIO_CAPS: 'radio_caps',
  SPECTRUM_FRAME: 'spectrum_frame',
} as const;

// Command payload schemas
const ConnectPayloadSchema = z.object({
  host: z.string().ip().optional(),
  port: z.number().int().positive().optional(),
});

const SetFrequencyPayloadSchema = z.object({
  frequency: z.number().int().nonnegative(),
});

const SetModePayloadSchema = z.object({
  mode: z.string(),
  bandwidthHz: z.number().int().positive().optional(),
});

const SetPowerPayloadSchema = z.object({
  power: z.number().min(0).max(100),
});

const SetPTTPayloadSchema = z.object({
  ptt: z.boolean(),
});

const TunePayloadSchema = z.object({
  ms: z.number().int().min(100).max(5000).optional().default(1200),
});

async function main() {
  const fastify = Fastify({ logger: { level: config.LOG_LEVEL } });
  const log = fastify.log;

  // CORS
  await fastify.register(cors, {
    origin: corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  });

  // Socket.IO
  const io = new IOServer(fastify.server, {
    path: '/socket.io',
    cors: {
      origin: corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Radio service
  const radio = new RadioService(config.RIGCTLD_HOST, config.RIGCTLD_PORT);

  // Relay radio events to all clients
  radio.on(EVENTS.RADIO_STATE, (state) => io.emit(EVENTS.RADIO_STATE, state));
  radio.on(EVENTS.CONNECTION_STATUS, (data) => io.emit(EVENTS.CONNECTION_STATUS, data));
  radio.on(EVENTS.RADIO_CAPS, (caps) => io.emit(EVENTS.RADIO_CAPS, caps));

  // HTTP routes
  fastify.get('/api/health', async () => ({
    name: 'rigboss-backend',
    version: '0.1.0',
    status: 'ok',
    uptimeSec: Math.floor(process.uptime()),
    rigctld: { host: config.RIGCTLD_HOST, port: config.RIGCTLD_PORT },
    metrics: radio.getMetrics(),
  }));

  fastify.get('/api/radio/state', async () => ({
    success: true,
    data: radio.getState(),
  }));

  fastify.get('/api/radio/caps', async () => ({
    success: true,
    data: await radio.getCapabilities(),
  }));

  // WebSocket command handlers
  io.on('connection', (socket) => {
    log.info({ id: socket.id }, 'WS client connected');

    socket.on('disconnect', (reason) => {
      log.info({ id: socket.id, reason }, 'WS client disconnected');
    });

    // Send capabilities to new clients
    radio.getCapabilities().then(caps => socket.emit(EVENTS.RADIO_CAPS, caps)).catch(() => {});

    socket.on('radio:connect', async (payload, cb) => {
      try {
        const dto = ConnectPayloadSchema.parse(payload);
        await radio.connect(dto.host, dto.port);
        cb && cb(null, { ok: true });
      } catch (e: any) {
        cb && cb(e.message, null);
      }
    });

    socket.on('radio:disconnect', async (payload, cb) => {
      try {
        await radio.disconnect();
        cb && cb(null, { ok: true });
      } catch (e: any) {
        cb && cb(e.message, null);
      }
    });

    socket.on('radio:setFrequency', async (payload, cb) => {
      try {
        const dto = SetFrequencyPayloadSchema.parse(payload);
        await radio.setFrequency(dto.frequency);
        cb && cb(null, { ok: true });
      } catch (e: any) {
        cb && cb(e.message, null);
      }
    });

    socket.on('radio:setMode', async (payload, cb) => {
      try {
        const dto = SetModePayloadSchema.parse(payload);
        await radio.setMode(dto.mode, dto.bandwidthHz);
        cb && cb(null, { ok: true });
      } catch (e: any) {
        cb && cb(e.message, null);
      }
    });

    socket.on('radio:setPower', async (payload, cb) => {
      try {
        const dto = SetPowerPayloadSchema.parse(payload);
        await radio.setPower(dto.power);
        cb && cb(null, { ok: true });
      } catch (e: any) {
        cb && cb(e.message, null);
      }
    });

    socket.on('radio:setPTT', async (payload, cb) => {
      try {
        const dto = SetPTTPayloadSchema.parse(payload);
        await radio.setPTT(dto.ptt);
        cb && cb(null, { ok: true });
      } catch (e: any) {
        cb && cb(e.message, null);
      }
    });

    socket.on('radio:tune', async (payload, cb) => {
      try {
        const dto = TunePayloadSchema.parse(payload);
        await radio.tune(dto.ms);
        cb && cb(null, { ok: true });
      } catch (e: any) {
        cb && cb(e.message, null);
      }
    });
  });

  // Start server
  await fastify.listen({ port: config.BACKEND_PORT, host: '0.0.0.0' });
  log.info(`Backend listening on 0.0.0.0:${config.BACKEND_PORT}`);

  // Connect to radio
  try {
    await radio.connect();
    log.info('Radio connected to rigctld');
  } catch (e) {
    log.warn('Initial radio connection failed; will retry in background');
  }
}

main().catch(console.error);