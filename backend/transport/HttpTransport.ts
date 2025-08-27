import express from 'express';
import cors from 'cors';
import type { ServiceRegistry } from './ServiceRegistry.js';
import type { ApiResponse } from '../types/services.js';

export class HttpTransport {
  private app: express.Application;
  private server: any;

  constructor(private serviceRegistry: ServiceRegistry, server?: any) {
    this.app = express();
    this.server = server;
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Allow cross-origin calls (safe for all paths)
    this.app.use(cors());

    // IMPORTANT: Do NOT run body parsers or wrappers on Socket.IO engine paths
    const skipSocketIO = (req: express.Request) => req.url.startsWith('/socket.io');

    // Body parsers only for non-socket.io requests
    this.app.use((req, res, next) => (skipSocketIO(req) ? next() : express.json()(req, res, next)));
    this.app.use((req, res, next) => (skipSocketIO(req) ? next() : express.urlencoded({ extended: true })(req, res, next)));

    // Request logging (skip socket.io noise)
    this.app.use((req, res, next) => {
      if (!skipSocketIO(req)) {
        console.log(`${req.method} ${req.path}`);
      }
      next();
    });

    // Response wrapper (skip socket.io requests)
    this.app.use((req, res, next) => {
      if (skipSocketIO(req)) return next();
      const originalJson = res.json;
      res.json = function(data: any) {
        if (!data?.timestamp) {
          const response: ApiResponse = {
            success: true,
            data,
            timestamp: Date.now(),
            service: 'http-transport',
            version: '1.0.0',
            ...data,
          };
          return originalJson.call(this, response);
        }
        return originalJson.call(this, data);
      };
      next();
    });
  }

  private setupRoutes(): void {
    // Service discovery
    this.app.get('/api/services', (req, res) => {
      const services = this.serviceRegistry.getAllMetadata();
      res.json({ services });
    });

    this.app.get('/api/services/:serviceName', (req, res) => {
      const metadata = this.serviceRegistry.getMetadata(req.params.serviceName);
      if (!metadata) {
        return res.status(404).json({
          success: false,
          error: 'Service not found',
          timestamp: Date.now(),
          service: 'http-transport',
          version: '1.0.0',
        });
      }
      res.json({ service: metadata });
    });

    this.app.get('/api/health', (req, res) => {
      const health = this.serviceRegistry.checkHealth();
      res.json({ health });
    });

    // Radio service routes
    this.setupRadioRoutes();

    // Audio service routes
    this.setupAudioRoutes();

    // Spectrum service routes
    this.setupSpectrumRoutes();

    // Config service routes
    this.setupConfigRoutes();

    // Error handling
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('HTTP Error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Internal server error',
        timestamp: Date.now(),
        service: 'http-transport',
        version: '1.0.0',
      });
    });
  }

  private setupRadioRoutes(): void {
    const router = express.Router();

    router.post('/connect', async (req, res) => {
      console.log('[HttpTransport] POST /api/radio/connect called with:', req.body);
      try {
        const radioService = this.serviceRegistry.get('radio');
        if (!radioService) {
          console.log('[HttpTransport] Radio service not available');
          return res.status(503).json({ success: false, error: 'Radio service not available' });
        }

        const { host, port } = req.body;
        console.log('[HttpTransport] Calling radioService.connect with:', { host, port });
        await (radioService as any).connect(host, port);
        console.log('[HttpTransport] Radio service connect successful');
        res.json({ success: true });
      } catch (error) {
        console.error('[HttpTransport] Radio connect error:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Connection failed'
        });
      }
    });

    router.post('/disconnect', async (req, res) => {
      try {
        const radioService = this.serviceRegistry.get('radio');
        if (!radioService) {
          return res.status(503).json({ success: false, error: 'Radio service not available' });
        }

        await (radioService as any).disconnect();
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Disconnect failed' 
        });
      }
    });

    router.get('/state', async (req, res) => {
      try {
        const radioService = this.serviceRegistry.get('radio');
        if (!radioService) {
          return res.status(503).json({ success: false, error: 'Radio service not available' });
        }

        const state = await (radioService as any).getState();
        res.json({ state });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to get state' 
        });
      }
    });

    router.post('/frequency', async (req, res) => {
      try {
        const radioService = this.serviceRegistry.get('radio');
        if (!radioService) {
          return res.status(503).json({ success: false, error: 'Radio service not available' });
        }

        const { frequency } = req.body;
        await (radioService as any).setFrequency(frequency);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to set frequency' 
        });
      }
    });

    router.post('/mode', async (req, res) => {
      try {
        const radioService = this.serviceRegistry.get('radio');
        if (!radioService) {
          return res.status(503).json({ success: false, error: 'Radio service not available' });
        }

        const { mode, bandwidth } = req.body;
        await (radioService as any).setMode(mode, bandwidth);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to set mode' 
        });
      }
    });

    router.post('/power', async (req, res) => {
      try {
        const radioService = this.serviceRegistry.get('radio');
        if (!radioService) {
          return res.status(503).json({ success: false, error: 'Radio service not available' });
        }

        const { power } = req.body;
        await (radioService as any).setPower(power);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to set power' 
        });
      }
    });

    router.post('/ptt', async (req, res) => {
      try {
        const radioService = this.serviceRegistry.get('radio');
        if (!radioService) {
          return res.status(503).json({ success: false, error: 'Radio service not available' });
        }

        const { enabled } = req.body;
        await (radioService as any).setPTT(enabled);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to set PTT' 
        });
      }
    });

    this.app.use('/api/radio', router);
  }

  private setupAudioRoutes(): void {
    const router = express.Router();

    router.post('/start', async (req, res) => {
      try {
        const audioService = this.serviceRegistry.get('audio');
        if (!audioService) {
          return res.status(503).json({ success: false, error: 'Audio service not available' });
        }

        await (audioService as any).startStreaming();
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to start audio'
        });
      }
    });

    router.post('/stop', async (req, res) => {
      try {
        const audioService = this.serviceRegistry.get('audio');
        if (!audioService) {
          return res.status(503).json({ success: false, error: 'Audio service not available' });
        }

        await (audioService as any).stopStreaming();
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to stop audio'
        });
      }
    });

    router.get('/status', async (req, res) => {
      try {
        const audioService = this.serviceRegistry.get('audio');
        if (!audioService) {
          return res.status(503).json({ success: false, error: 'Audio service not available' });
        }

        res.json({
          available: (audioService as any).isAvailable(),
          streaming: (audioService as any).isStreaming()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get audio status'
        });
      }
    });

    this.app.use('/api/audio', router);
  }

  private setupSpectrumRoutes(): void {
    const router = express.Router();

    router.post('/start', async (req, res) => {
      try {
        const spectrumService = this.serviceRegistry.get('spectrum');
        if (!spectrumService) {
          return res.status(503).json({ success: false, error: 'Spectrum service not available' });
        }

        await (spectrumService as any).startAnalysis();
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to start spectrum analysis'
        });
      }
    });

    router.post('/stop', async (req, res) => {
      try {
        const spectrumService = this.serviceRegistry.get('spectrum');
        if (!spectrumService) {
          return res.status(503).json({ success: false, error: 'Spectrum service not available' });
        }

        await (spectrumService as any).stopAnalysis();
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to stop spectrum analysis'
        });
      }
    });

    router.get('/settings', async (req, res) => {
      try {
        const spectrumService = this.serviceRegistry.get('spectrum');
        if (!spectrumService) {
          return res.status(503).json({ success: false, error: 'Spectrum service not available' });
        }

        const settings = (spectrumService as any).getSettings();
        res.json({ settings });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get spectrum settings'
        });
      }
    });

    router.post('/settings', async (req, res) => {
      try {
        const spectrumService = this.serviceRegistry.get('spectrum');
        if (!spectrumService) {
          return res.status(503).json({ success: false, error: 'Spectrum service not available' });
        }

        await (spectrumService as any).setSettings(req.body);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update spectrum settings'
        });
      }
    });

    this.app.use('/api/spectrum', router);
  }

  private setupConfigRoutes(): void {
    const router = express.Router();

    router.get('/', async (req, res) => {
      try {
        const configService = this.serviceRegistry.get('config');
        if (!configService) {
          return res.status(503).json({ success: false, error: 'Config service not available' });
        }

        const config = await (configService as any).getConfig();
        res.json({ config });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get config'
        });
      }
    });

    router.post('/', async (req, res) => {
      try {
        const configService = this.serviceRegistry.get('config');
        if (!configService) {
          return res.status(503).json({ success: false, error: 'Config service not available' });
        }

        await (configService as any).updateConfig(req.body);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update config'
        });
      }
    });

    router.post('/reset', async (req, res) => {
      try {
        const configService = this.serviceRegistry.get('config');
        if (!configService) {
          return res.status(503).json({ success: false, error: 'Config service not available' });
        }

        await (configService as any).resetConfig();
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to reset config'
        });
      }
    });

    this.app.use('/api/config', router);
  }

  listen(port: number): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        // Use existing server
        this.server.listen(port, () => {
          console.log(`HTTP transport listening on port ${port}`);
          resolve();
        });
      } else {
        // Create new server
        this.server = this.app.listen(port, () => {
          console.log(`HTTP transport listening on port ${port}`);
          resolve();
        });
      }
    });
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('HTTP transport closed');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getApp(): express.Application {
    return this.app;
  }
}
