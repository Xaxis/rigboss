import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ok, fail } from "../response.js";
import type { SpectrumService } from "../services/spectrum.js";
import { SpectrumSettingsSchema } from "../dtos.js";

export async function spectrumRoutes(app: FastifyInstance, spec: SpectrumService) {
  app.post("/api/spectrum/start", async () => {
    spec.emitDummyFrame();
    return ok({ started: true });
  });
  app.post("/api/spectrum/stop", async () => ok({ started: false }));
  app.get("/api/spectrum/settings", async () => ok(spec.getSettings()));

  app.post("/api/spectrum/settings", async (req, rep) => {
    try {
      const body = SpectrumSettingsSchema.partial().parse(req.body);
      spec.setSettings(body);
      return ok(spec.getSettings());
    } catch (e: any) {
      rep.status(400);
      return fail(e.message ?? "invalid spectrum settings");
    }
  });
}

