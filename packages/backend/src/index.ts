import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server as IOServer } from 'socket.io';
import { createServer } from 'node:http';
import pino from 'pino';

import { loadConfig } from './config.js';
import { EVENTS } from './events.js';
import { RadioService } from './services/radio.js';
import { RigctldAdapter } from './adapters/rigctld.js';
import { ConnectPayloadSchema, SetFrequencyPayloadSchema, SetModePayloadSchema, SetPowerPayloadSchema, SetPTTPayloadSchema, TunePayloadSchema } from './dtos.js';
import type { RadioState } from './dtos.js';
import { radioRoutes } from './routes/radio.js';

async function main() {
  const cfg = loadConfig();

  const fastify = Fastify({ logger: { level: cfg.LOG_LEVEL } });

  const log = fastify.log;

  const corsOrigins = cfg.corsOrigins;
  await fastify.register(cors, {
    origin: corsOrigins === '*' ? true : (origin, cb) => {
      if (!origin) return cb(null, true);
      const allowed = Array.isArray(corsOrigins) && corsOrigins.some((o) => origin.startsWith(o));
      cb(null, allowed);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  });
  // Minor: include simple radio metrics in health


  // Health endpoint
  fastify.get('/api/health', async () => ({
    name: 'rigboss-backend',
    version: '0.1.0',
    status: 'ok',
    uptimeSec: Math.floor(process.uptime()),
    services: ['radio'],
    rigctld: { host: cfg.RIGCTLD_HOST, port: cfg.RIGCTLD_PORT },
    metrics: {
      // Room for future queue metrics; keep minimal now
      connected: true,
    },
    metrics: () => (radio as any).getMetrics ? (radio as any).getMetrics() : undefined,

  }));

  const io = new IOServer(fastify.server, {
    path: '/socket.io',
    cors: {
      origin: corsOrigins === '*' ? true : (Array.isArray(corsOrigins) ? corsOrigins : []),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Radio service
  const radio = new RadioService(new RigctldAdapter(cfg.RIGCTLD_HOST, cfg.RIGCTLD_PORT));

  // Relay radio events to all clients
  radio.on(EVENTS.RADIO_STATE, (state: RadioState) => io.emit(EVENTS.RADIO_STATE, state));
  radio.on(EVENTS.CONNECTION_STATUS, (data: { connected: boolean }) => io.emit(EVENTS.CONNECTION_STATUS, data));

  // WebSocket handlers
  io.on('connection', (socket) => {
    log.info({ id: socket.id }, 'WS client connected');

    socket.on('disconnect', (reason) => {
      log.info({ id: socket.id, reason }, 'WS client disconnected');
    });

    socket.on('radio:connect', async (payload, cb) => {
      try {
        const dto = ConnectPayloadSchema.parse(payload ?? {});
        const ok = await radio.connect(dto.host, dto.port);
        cb && cb(null, { ok });
      } catch (e: any) {
        cb && cb(e.message || 'invalid payload');
      }
    });

    socket.on('radio:disconnect', async (_payload, cb) => {
      try {
        await radio.disconnect();
        cb && cb(null, { ok: true });
      } catch (e: any) {
        cb && cb(e.message || 'error');
      }
    });

    socket.on('radio:setFrequency', async (payload, cb) => {
      try {
        const dto = SetFrequencyPayloadSchema.parse(payload);
        await radio.setFrequency(dto.frequency);
        cb && cb(null, { ok: true });
      } catch (e: any) {
        cb && cb(e.message || 'error');
      }
    });

    socket.on('radio:setMode', async (payload, cb) => {
      try {
        const dto = SetModePayloadSchema.parse(payload);
        await radio.setMode(dto.mode, dto.bandwidthHz);
        cb && cb(null, { ok: true });
      } catch (e: any) {
        cb && cb(e.message || 'error');
      }
    });

    socket.on('radio:setPower', async (payload, cb) => {
      try {
        const dto = SetPowerPayloadSchema.parse(payload);
        await radio.setPower(dto.power);
        cb && cb(null, { ok: true });
      } catch (e: any) {
        cb && cb(e.message || 'error');
      }
    });

    socket.on('radio:setPTT', async (payload, cb) => {
      try {
        const dto = SetPTTPayloadSchema.parse(payload);
        await radio.setPTT(dto.ptt);
        cb && cb(null, { ok: true });
      } catch (e: any) {
        cb && cb(e.message || 'error');
      }
    });

    socket.on('radio:tune', async (payload, cb) => {
      try {
        const dto = TunePayloadSchema.parse(payload ?? {});
        await radio.tune(dto.ms);
        cb && cb(null, { ok: true });
      } catch (e: any) {
        cb && cb(e.message || 'error');
      }
    });
  });

  // Minimal HTTP debug routes
  await fastify.register(async (instance) => {
    await radioRoutes(instance, { radio });
  });

  // Start server
  await fastify.listen({ port: cfg.BACKEND_PORT, host: '0.0.0.0' });
  log.info(`Backend listening on 0.0.0.0:${cfg.BACKEND_PORT}`);

  // Connection lifecycle: try connect and poll
  const attemptConnect = async () => {
    let backoff = 1500;
    // Try initial connect immediately
    for (;;) {
      try {
        const ok = await radio.connect(cfg.RIGCTLD_HOST, cfg.RIGCTLD_PORT);
        if (ok) {
          log.info({ target: { host: cfg.RIGCTLD_HOST, port: cfg.RIGCTLD_PORT } }, 'Radio connected to rigctld');
          return;
        }
        log.warn(`Radio connect returned false, retrying in ${Math.floor(backoff)} ms`);
      } catch (err: any) {
        log.error({ err, target: { host: cfg.RIGCTLD_HOST, port: cfg.RIGCTLD_PORT } }, 'Radio connect failed');
      }
      await new Promise((r) => setTimeout(r, backoff));
      backoff = Math.min(backoff * 1.5, 15000);
    }
  };

  attemptConnect().catch((e) => log.error(e, 'Radio connect loop error'));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

