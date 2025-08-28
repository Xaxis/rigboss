import Fastify from "fastify";
import cors from "@fastify/cors";
import { Server as IOServer } from "socket.io";
import { getConfig } from "./config.js";
import { ok } from "./response.js";
import { ServiceRegistry } from "./service-registry.js";
import { SERVICE_NAME, SERVICE_VERSION } from "./constants.js";
import { RadioService } from "./services/radio.js";
import { MockRigctlAdapter } from "./adapters/mock-rigctl.js";
import { radioRoutes } from "./routes/radio.js";
import { audioRoutes } from "./routes/audio.js";
import { spectrumRoutes } from "./routes/spectrum.js";
import { configRoutes } from "./routes/config.js";
import { EVENTS } from "./events.js";

const startedAt = Date.now();

async function start() {
  const config = getConfig();
  const app = Fastify({
    logger:
      process.env.NODE_ENV === "production"
        ? { level: process.env.LOG_LEVEL ?? "info" }
        : {
            level: process.env.LOG_LEVEL ?? "info",
            transport: { target: "pino-pretty", options: { colorize: true } },
          },
  });

  // CORS for HTTP
  await app.register(cors, {
    origin: config.CORS_ORIGIN ? config.CORS_ORIGIN.split(",") : true,
  });

  const registry = new ServiceRegistry();

  // Instantiate services and register
  const radio = new RadioService({ adapter: new MockRigctlAdapter() });
  const audio = new (await import("./services/audio.js")).AudioService();
  const spectrum = new (await import("./services/spectrum.js")).SpectrumService();
  const configSvc = new (await import("./services/config.js")).ConfigService();

  registry.register({
    metadata: {
      name: "radio",
      version: "0.1.0",
      endpoints: [
        { method: "POST", path: "/api/radio/connect" },
        { method: "POST", path: "/api/radio/disconnect" },
        { method: "GET", path: "/api/radio/state" },
        { method: "POST", path: "/api/radio/frequency" },
        { method: "POST", path: "/api/radio/mode" },
        { method: "POST", path: "/api/radio/power" },
        { method: "POST", path: "/api/radio/ptt" }
      ],
    },
    getHealth: async () => ({
      name: "radio",
      version: "0.1.0",
      status: "healthy",
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    }),
  });

  registry.register({
    metadata: {
      name: "audio",
      version: "0.1.0",
      endpoints: [
        { method: "POST", path: "/api/audio/start" },
        { method: "POST", path: "/api/audio/stop" },
        { method: "GET", path: "/api/audio/status" }
      ],
    },
    getHealth: async () => ({
      name: "audio",
      version: "0.1.0",
      status: "healthy",
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    }),
  });

  registry.register({
    metadata: {
      name: "spectrum",
      version: "0.1.0",
      endpoints: [
        { method: "POST", path: "/api/spectrum/start" },
        { method: "POST", path: "/api/spectrum/stop" },
        { method: "GET", path: "/api/spectrum/settings" },
        { method: "POST", path: "/api/spectrum/settings" }
      ],
    },
    getHealth: async () => ({
      name: "spectrum",
      version: "0.1.0",
      status: "healthy",
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    }),
  });

  registry.register({
    metadata: {
      name: "config",
      version: "0.1.0",
      endpoints: [
        { method: "GET", path: "/api/config" },
        { method: "POST", path: "/api/config" },
        { method: "POST", path: "/api/config/reset" }
      ],
    },
    getHealth: async () => ({
      name: "config",
      version: "0.1.0",
      status: "healthy",
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    }),
  });

  // HTTP routes
  await radioRoutes(app, radio);
  await audioRoutes(app, audio);
  await spectrumRoutes(app, spectrum);
  await configRoutes(app, configSvc);

  app.get("/api/health", async (_req, _rep) => {
    const uptimeSec = Math.floor((Date.now() - startedAt) / 1000);
    const services = await registry.checkHealth().catch(() => []);
    return ok({
      name: SERVICE_NAME,
      version: SERVICE_VERSION,
      status: "healthy",
      uptimeSec,
      services,
    });
  });

  app.get("/api/services", async () => {
    return ok(registry.listMetadata());
  });

  // Start listen first to have server
  await app.listen({ port: config.BACKEND_PORT, host: "0.0.0.0" });

  // Socket.IO sharing the same HTTP server
  const io = new IOServer(app.server, {
    path: "/socket.io",
    cors: {
      origin: config.CORS_ORIGIN ? config.CORS_ORIGIN.split(",") : true,
    },
  });

  function wireNamespace(nsp: string) {
    const namespace = io.of(nsp);
    namespace.on("connection", (socket) => {
      app.log.info({ nsp, id: socket.id }, "socket connected");
      socket.on("disconnect", (reason) => {
        app.log.info({ nsp, id: socket.id, reason }, "socket disconnected");
      });
    });
  }

  // root namespace: connection status passthrough
  radio.on(EVENTS.CONNECTION_STATUS, (payload) => io.emit(EVENTS.CONNECTION_STATUS, payload));
  radio.on(EVENTS.RADIO_STATE, (state) => io.of("/radio").emit(EVENTS.RADIO_STATE, state));
  audio.on(EVENTS.AUDIO_STATUS, (status) => io.of("/audio").emit(EVENTS.AUDIO_STATUS, status));
  spectrum.on(EVENTS.SPECTRUM_FRAME, (frame) => io.of("/spectrum").emit(EVENTS.SPECTRUM_FRAME, frame));
  spectrum.on(EVENTS.SPECTRUM_SETTINGS_CHANGED, (settings) => io.of("/spectrum").emit(EVENTS.SPECTRUM_SETTINGS_CHANGED, settings));

  wireNamespace("/");
  wireNamespace("/radio");
  wireNamespace("/audio");
  wireNamespace("/spectrum");

  app.log.info(
    { port: config.BACKEND_PORT },
    `Backend listening on :${config.BACKEND_PORT}`
  );
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Fatal startup error", err);
  process.exit(1);
});

