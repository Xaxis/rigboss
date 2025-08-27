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

// Create HTTP server and Socket.IO first (needed for AudioService)
const server = createServer();
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Create and register services
const configService = new ConfigService(config);
const radioService = new RadioService(config.radio);
const audioService = new AudioService(config.audio, io);
const spectrumService = new SpectrumService(config.spectrum);

// Register services
serviceRegistry.register(configService);
serviceRegistry.register(radioService);
serviceRegistry.register(audioService);
serviceRegistry.register(spectrumService);

// Connect spectrum service to audio service for real-time processing
spectrumService.connectToAudioService(audioService);

// Create transport layers
const httpTransport = new HttpTransport(serviceRegistry, server);

// Create socket transport
const socketTransport = new SocketTransport(io, serviceRegistry);

// Setup Socket.IO namespaces and event handling (legacy compatibility)
function setupLegacySocketHandlers() {
  // Main namespace for service discovery
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Send service discovery info
    socket.emit('services_available', {
      services: serviceRegistry.getAllMetadata(),
      endpoints: serviceRegistry.getServiceEndpoints(),
    });

    // Send current health status
    socket.emit('health_status', serviceRegistry.checkHealth());

    // Legacy compatibility - emit connection status for existing frontend
    const radioMeta = serviceRegistry.getMetadata('radio');
    if (radioMeta) {
      socket.emit('connection_status', {
        connected: radioMeta.health.details?.rigctldConnected || false,
        radio: radioMeta.health.details?.lastState || 'Unknown'
      });
    }

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Radio namespace
  const radioNamespace = io.of('/radio');
  radioNamespace.on('connection', (socket) => {
    console.log('Radio client connected:', socket.id);
    
    socket.on('disconnect', () => {
      console.log('Radio client disconnected:', socket.id);
    });
  });

  // Forward radio service events to all connected clients
  radioService.on('event', (event) => {
    // Emit to main namespace for legacy compatibility
    io.emit(event.type, event.data);
    
    // Also emit to radio namespace
    radioNamespace.emit(event.type, event.data);
    
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

  // Service registry events
  serviceRegistry.on('serviceStatusChanged', (event) => {
    io.emit('service_status_changed', event);
  });

  serviceRegistry.on('serviceEvent', (event) => {
    io.emit('service_event', event);
  });
}

// Startup sequence
async function startServer() {
  try {
    console.log('Starting rigboss backend server...');
    
    // Setup legacy socket handlers for compatibility
    setupLegacySocketHandlers();
    
    // Start all services
    console.log('Starting services...');
    await serviceRegistry.startAll();
    
    // Start HTTP server
    await httpTransport.listen(config.network.serverPort);
    
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
