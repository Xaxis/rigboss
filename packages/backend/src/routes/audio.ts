import type { FastifyInstance } from "fastify";
import { ok, fail } from "../response.js";
import type { AudioService } from "../services/audio.js";

export async function audioRoutes(app: FastifyInstance, audio: AudioService) {
  app.post("/api/audio/start", async (req, rep) => {
    try {
      const prefer = (req.headers["x-audio-mode"] as string | undefined) ?? "pcm";
      if (prefer === "webrtc") audio.startWebRTC();
      else audio.startPCM();
      return ok(audio.getStatus());
    } catch (e: any) {
      rep.status(400);
      return fail(e.message ?? "unable to start audio");
    }
  });

  app.post("/api/audio/stop", async () => ok((audio.stop(), audio.getStatus())));
  app.get("/api/audio/status", async () => ok(audio.getStatus()));
}

