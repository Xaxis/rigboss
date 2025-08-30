import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config/env.js';
import { RadioService } from './radio/service.js';
import { AudioService } from './audio/service.js';
import { SpectrumService } from './spectrum/service.js';
import { EVENTS } from './events.js';
import {
  SetFrequencySchema,
  SetModeSchema,
  SetPowerSchema,
  SetPTTSchema,
  TuneSchema,
  ConnectSchema,
} from './radio/types.js';

async function main() {
  console.log('🚀 Starting rigboss backend...');

  // Initialize Fastify
  const fastify = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport: config.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: { colorize: true }
      } : undefined,
    },
  });

  // CORS configuration for cross-network support
  await fastify.register(cors, {
    origin: config.CORS_ORIGIN,
    credentials: true,
  });

  // Initialize services
  const radioService = new RadioService(config.RIGCTLD_HOST, config.RIGCTLD_PORT);
  const audioService = new AudioService({
    enabled: config.AUDIO_ENABLED,
    sampleRate: config.AUDIO_SAMPLE_RATE,
    bufferSize: config.AUDIO_BUFFER_SIZE,
  });

  const spectrumService = new SpectrumService({ sampleRate: config.AUDIO_SAMPLE_RATE });

  // Initialize Socket.IO
  const io = new SocketIOServer(fastify.server, {
    cors: {
      origin: config.CORS_ORIGIN,
      credentials: true,
    },
  });

  // HTTP Routes
  fastify.get('/api/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      radio: radioService.getMetrics(),
      audio: {
        enabled: config.AUDIO_ENABLED,
        active: audioService.isActive(),
      },
    };
  });

  // Temporary compatibility route to avoid 500s from older frontend code
  fastify.get('/api/spectrum/detect-source', async () => {
    return { success: true, data: { source: 'PCM' } };
  });

  fastify.get('/api/radio/state', async () => {
    return radioService.getState();
  });

  fastify.get('/api/radio/capabilities', async () => {
    return await radioService.getCapabilities();
  });

  // WebSocket connection handling
  io.on('connection', (socket) => {
    fastify.log.info({ id: socket.id }, 'Client connected');

    socket.on('disconnect', (reason) => {
      fastify.log.info({ id: socket.id, reason }, 'Client disconnected');
    });

    // Send initial state to new clients
    socket.emit(EVENTS.RADIO_STATE, {
      timestamp: Date.now(),
      state: radioService.getState(),
    });

    radioService.getCapabilities()
      .then(caps => socket.emit(EVENTS.RADIO_CAPABILITIES, { capabilities: caps }))
      .catch(() => {});

    // Radio command handlers
    socket.on('radio:connect', async (payload, callback) => {
      try {
        const { host, port } = ConnectSchema.parse(payload || {});
        await radioService.connect(host, port);
        callback?.(null, { success: true });
      } catch (error: any) {
        callback?.(error.message, null);
      }
    });

    socket.on('radio:disconnect', async (payload, callback) => {
      try {
        await radioService.disconnect();
        callback?.(null, { success: true });
      } catch (error: any) {
        callback?.(error.message, null);
      }
    });

    socket.on('radio:setFrequency', async (payload, callback) => {
      try {
        const { frequency } = SetFrequencySchema.parse(payload);
        await radioService.setFrequency(frequency);
        callback?.(null, { success: true });
      } catch (error: any) {
        callback?.(error.message, null);
      }
    });

    socket.on('radio:setMode', async (payload, callback) => {
      try {
        const { mode, bandwidthHz } = SetModeSchema.parse(payload);
        await radioService.setMode(mode, bandwidthHz);
        callback?.(null, { success: true });
      } catch (error: any) {
        callback?.(error.message, null);
      }
    });

    socket.on('radio:setPower', async (payload, callback) => {
      try {
        const { power } = SetPowerSchema.parse(payload);
        await radioService.setPower(power);
        callback?.(null, { success: true });
      } catch (error: any) {
        callback?.(error.message, null);
      }
    });

    socket.on('radio:setPTT', async (payload, callback) => {
      try {
        const { ptt } = SetPTTSchema.parse(payload);
        await radioService.setPTT(ptt);
        callback?.(null, { success: true });
      } catch (error: any) {
        callback?.(error.message, null);
      }
    });

    socket.on('radio:tune', async (payload, callback) => {
      try {
        const { ms } = TuneSchema.parse(payload || {});
        await radioService.tune(ms);
        callback?.(null, { success: true });
      } catch (error: any) {
        callback?.(error.message, null);
      }
    });

    // Spectrum settings via WS
    socket.on('spectrum:settings:set', (payload, callback) => {
      try {
        const applied = spectrumService.applySettings(payload || {});
        callback?.(null, { success: true, settings: applied });
      } catch (e: any) {
        callback?.(e.message || 'Failed to apply spectrum settings', null);
      }
    });
  });

  // Event relay: Service events → WebSocket broadcasts
  radioService.on(EVENTS.RADIO_STATE, (data) => {
    io.emit(EVENTS.RADIO_STATE, data);
  });

  radioService.on(EVENTS.RADIO_CONNECTED, (data) => {
    io.emit(EVENTS.RADIO_CONNECTED, data);
  });

  radioService.on(EVENTS.RADIO_DISCONNECTED, (data) => {
    io.emit(EVENTS.RADIO_DISCONNECTED, data);
  });

  radioService.on(EVENTS.RADIO_CAPABILITIES, (data) => {
    io.emit(EVENTS.RADIO_CAPABILITIES, data);

  // Spectrum event relay
  spectrumService.on(EVENTS.SPECTRUM_FRAME, (data) => {
    io.emit(EVENTS.SPECTRUM_FRAME, data);
  });
  spectrumService.on(EVENTS.SPECTRUM_SETTINGS, (data) => {
    io.emit(EVENTS.SPECTRUM_SETTINGS, data);
  });
  });

  radioService.on(EVENTS.RADIO_ERROR, (data) => {
    io.emit(EVENTS.RADIO_ERROR, data);
  });

  // Start spectrum after radio connected so center coupling can work
  try {
    spectrumService.start();
    fastify.log.info('Spectrum service started');
  } catch (error) {
    fastify.log.warn('Spectrum service failed to start');
  }

  audioService.on(EVENTS.AUDIO_LEVEL, (data) => {
    io.emit(EVENTS.AUDIO_LEVEL, data);
  });

  audioService.on(EVENTS.AUDIO_ERROR, (data) => {
    io.emit(EVENTS.AUDIO_ERROR, data);
  });

  // Start services
  try {
    await audioService.start();
    fastify.log.info('Audio service started');
  } catch (error) {
    fastify.log.warn('Audio service failed to start');
  }

  try {
    await radioService.connect();
    fastify.log.info('Radio service connected');
  } catch (error) {
    fastify.log.warn('Initial radio connection failed - will retry');
  }

  // Start server
  await fastify.listen({ port: config.PORT, host: config.HOST });
  fastify.log.info(`🎛️ Rigboss backend running on ${config.HOST}:${config.PORT}`);
}

main().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});