import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { RigctlService } from './services/RigctlService.js';
import type { WebSocketMessage, RadioState, AppConfig } from '../src/types/radio.js';
import { WebRTCAudioService } from './services/WebRTCAudioService.js';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  path: '/socket.io',
  cors: {
    origin: true, // allow LAN/dev by default; Astro dev proxy handles same-origin
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Configuration
const config = {
  rigctld: {
    host: process.env.RIGCTLD_HOST || 'localhost',
    port: parseInt(process.env.RIGCTLD_PORT || '4532'),
    reconnectInterval: 5000,
    commandTimeout: 3000
  },
  server: {
    port: parseInt(process.env.BACKEND_PORT || '3001')
  },
  polling: {
    interval: parseInt(process.env.POLL_INTERVAL || '1000')
  }
};

// Initialize rigctld service
const rigctlService = new RigctlService(config.rigctld);
let pollingInterval: NodeJS.Timeout | null = null;

// Radio state polling
function startPolling() {
  if (pollingInterval) return;

  pollingInterval = setInterval(async () => {
    try {
      if (rigctlService.isConnected()) {
        const state = await rigctlService.pollRadioState();
        io.emit('radio_state', state);
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, config.polling.interval);
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

// Optional WebRTC audio service (feature-gated)
let audioService: WebRTCAudioService | null = null;
(async () => {
  audioService = new WebRTCAudioService(io);
  await audioService.init();
  audioService.attachNamespace();
})();
// rigctld event handlers
rigctlService.on('connected', () => {
  console.log('rigctld connected');
  io.emit('connection_status', { connected: true });
  startPolling();
});

rigctlService.on('disconnected', () => {
  console.log('rigctld disconnected');
  io.emit('connection_status', { connected: false });
  stopPolling();
});

rigctlService.on('error', (error) => {
  console.error('rigctld error:', error);
  io.emit('error', { message: error.message });
});

rigctlService.on('stateChanged', (state: Partial<RadioState>) => {
  io.emit('radio_state', state);
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Try to connect to rigctld when first client connects (if not already connected)
  if (!rigctlService.isConnected()) {
    console.log('Client connected - attempting to connect to rigctld...');
    rigctlService.connect().catch(error => {
      console.log('rigctld not available - continuing without radio connection');
    });
  }

  // Send current state to new client
  socket.emit('connection_status', {
    connected: rigctlService.isConnected(),
    radio: rigctlService.getCurrentState().model
  });

  const currentState = rigctlService.getCurrentState();
  if (Object.keys(currentState).length > 0) {
    socket.emit('radio_state', currentState);
  }

  // Handle radio commands
  socket.on('command', async (message: { type: 'command'; data: any }) => {
    try {
      const { command, parameters = [] } = message.data;
      let result;

      switch (command) {
        case 'set_frequency':
          await rigctlService.setFrequency(parameters[0]);
          result = { success: true };
          break;

        case 'set_mode':
          await rigctlService.setMode(parameters[0], parameters[1]);
          result = { success: true };
          break;

        case 'set_power':
          await rigctlService.setPowerLevel(parameters[0]);
          result = { success: true };
          break;

        case 'set_ptt':
          await rigctlService.setPTT(parameters[0]);
          result = { success: true };
          break;

        case 'get_frequency':
          result = await rigctlService.getFrequency();
          break;

        case 'get_mode':
          result = await rigctlService.getMode();
          break;

        case 'get_power':
          result = await rigctlService.getPowerLevel();
          break;

        case 'get_ptt':
          result = await rigctlService.getPTT();
          break;

        case 'get_radio_info':
          result = await rigctlService.getRadioInfo();
          break;

        default:
          throw new Error(`Unknown command: ${command}`);
      }

      socket.emit('response', { success: true, data: result });
    } catch (error) {
      console.error('Command error:', error);
      socket.emit('response', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// REST API endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    rigctld: {
      connected: rigctlService.isConnected(),
      host: config.rigctld.host,
      port: config.rigctld.port
    },
    uptime: process.uptime()
  });
});

app.post('/api/connect', async (req, res) => {
  try {
    const { host, port } = req.body;

    // Update config if provided
    if (host) config.rigctld.host = host;
    if (port) config.rigctld.port = port;

    // Disconnect if already connected
    if (rigctlService.isConnected()) {
      rigctlService.disconnect();
    }

    // Create new service with updated config
    const newService = new RigctlService(config.rigctld);

    // Copy event handlers
    newService.on('connected', () => {
      console.log('rigctld connected');
      io.emit('connection_status', { connected: true });
      startPolling();
    });

    newService.on('disconnected', () => {
      console.log('rigctld disconnected');
      io.emit('connection_status', { connected: false });
      stopPolling();
    });

    newService.on('error', (error) => {
      console.error('rigctld error:', error);
      io.emit('error', { message: error.message });
    });

    newService.on('stateChanged', (state) => {
      io.emit('radio_state', state);
    });

    await newService.connect();

    res.json({
      success: true,
      message: `Connected to rigctld at ${config.rigctld.host}:${config.rigctld.port}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed'
    });
  }
});

app.get('/api/radio/state', async (req, res) => {
  try {
    if (!rigctlService.isConnected()) {
      return res.status(503).json({ error: 'Not connected to radio' });
    }

    const state = await rigctlService.pollRadioState();
    res.json(state);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/radio/frequency', async (req, res) => {
  try {
    const { frequency } = req.body;
    if (typeof frequency !== 'number') {
      return res.status(400).json({ error: 'Invalid frequency' });
    }

    await rigctlService.setFrequency(frequency);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/radio/mode', async (req, res) => {
  try {
    const { mode, bandwidth } = req.body;
    await rigctlService.setMode(mode, bandwidth);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/radio/ptt', async (req, res) => {
  try {
    const { enabled } = req.body;
    await rigctlService.setPTT(enabled);
    // Gate audio TX path as well (if available)
    if (audioService) audioService.setTxEnabled(!!enabled);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
const PORT = config.server.port;

server.listen(PORT, () => {
  console.log(`rigboss backend server running on port ${PORT}`);
  console.log(`Will attempt to connect to rigctld at ${config.rigctld.host}:${config.rigctld.port}`);
  console.log('Backend is ready - frontend will work even without rigctld connection');

  // Don't connect immediately - let it happen on first client connection or manual trigger
  // This allows the backend to start successfully even without rigctld
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  stopPolling();
  rigctlService.disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  stopPolling();
  rigctlService.disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
