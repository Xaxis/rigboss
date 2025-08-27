// Rigboss backend server - modular architecture
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { loadConfig } from './config/index.js';
import { ServiceRegistry } from './transport/ServiceRegistry.js';
import { HttpTransport } from './transport/HttpTransport.js';
import { SocketTransport } from './transport/SocketTransport.js';
import { RadioService } from './services/RadioService.js';
import { AudioService } from './services/AudioService.js';
import { SpectrumService } from './services/SpectrumService.js';
import { ConfigService } from './services/ConfigService.js';

// Load configuration
const config = loadConfig();
console.log('Loaded configuration:', JSON.stringify(config, null, 2));

// Create service registry
const serviceRegistry = new ServiceRegistry();

// Create Express app via HttpTransport first
const httpTransport = new HttpTransport(serviceRegistry);
const app = httpTransport.getApp();

// Create HTTP server from express app, then attach Socket.IO
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET','POST'] }
});

// Create and register services (AudioService receives io)
const configService = new ConfigService(config);
const radioService = new RadioService(config.radio);
const audioService = new AudioService(config.audio, io);
const spectrumService = new SpectrumService(config.spectrum);

serviceRegistry.register(configService);
serviceRegistry.register(radioService);
serviceRegistry.register(audioService);
serviceRegistry.register(spectrumService);

// Cross-wire services
spectrumService.connectToAudioService(audioService);

// Initialize Socket.IO transport (handles all socket connections and events)
new SocketTransport(io, serviceRegistry);

// CRITICAL: Set up radio service event forwarding for legacy frontend compatibility
function setupRadioEventForwarding() {
  radioService.on('event', (event: any) => {
    // Forward radio events to main namespace for legacy compatibility
    io.emit(event.type, event.data);

    // Special handling for state changes to maintain compatibility
    if (event.type === 'state_changed') {
      io.emit('radio_state', event.data);
      io.emit('connection_status', {
        connected: true,
        radio: event.data.model || 'Connected'
      });
    }

    if (event.type === 'connected') {
      io.emit('connection_status', {
        connected: true,
        radio: 'Connected'
      });
    }

    if (event.type === 'disconnected') {
      io.emit('connection_status', {
        connected: false,
        radio: 'Disconnected'
      });
    }
  });
}

// Startup sequence
async function startServer() {
  try {
    console.log('Starting rigboss backend server...');

    // Start all services
    console.log('Starting services...');
    await serviceRegistry.startAll();

    // Set up radio event forwarding after services are started
    setupRadioEventForwarding();
    
    // Start HTTP server (use the same server instance that Socket.IO is attached to)
    await new Promise<void>((resolve) => {
      server.listen(config.network.serverPort, () => {
        console.log(`HTTP transport listening on port ${config.network.serverPort}`);
        resolve();
      });
    });

    console.log(`rigboss backend server running on port ${config.network.serverPort}`);
    console.log(`Will attempt to connect to rigctld at ${config.radio.rigctldHost}:${config.radio.rigctldPort}`);
    console.log('Backend is ready - frontend will work even without rigctld connection');
    
    // Log available services
    const services = serviceRegistry.getAllMetadata();
    console.log('Available services:');
    services.forEach(service => {
      console.log(`  - ${service.name} v${service.version} (${service.status})`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down gracefully...');
  
  try {
    // Stop all services
    await serviceRegistry.stopAll();
    
    // Close HTTP server
    await httpTransport.close();
    
    console.log('Server closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Signal handlers
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  shutdown();
});

// Start the server
startServer();
