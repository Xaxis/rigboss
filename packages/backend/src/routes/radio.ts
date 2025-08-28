import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ok, fail } from "../response.js";
import type { RadioService } from "../services/radio.js";
import { RadioModeEnum } from "../dtos.js";

export async function radioRoutes(app: FastifyInstance, service: RadioService) {
  const connectSchema = z.object({ host: z.string(), port: z.coerce.number() });
  const freqSchema = z.object({ hz: z.coerce.number() });
  const modeSchema = z.object({ mode: RadioModeEnum, bandwidthHz: z.coerce.number().optional() });
  const powerSchema = z.object({ percent: z.coerce.number() });
  const pttSchema = z.object({ ptt: z.boolean() });

  app.post("/api/radio/connect", async (req, rep) => {
    try {
      const body = connectSchema.parse(req.body);
      await service.connect(body.host, body.port);
      return ok({ connected: true });
    } catch (e: any) {
      rep.status(400);
      return fail(e.message ?? "invalid payload");
    }
  });

  app.post("/api/radio/disconnect", async (_req) => {
    await service.disconnect();
    return ok({ connected: false });
  });

  app.get("/api/radio/state", async () => ok(service.getState()));

  app.post("/api/radio/frequency", async (req, rep) => {
    try {
      const body = freqSchema.parse(req.body);
      await service.setFrequency(body.hz);
      return ok(service.getState());
    } catch (e: any) {
      rep.status(400);
      return fail(e.message ?? "invalid payload");
    }
  });

  app.post("/api/radio/mode", async (req, rep) => {
    try {
      const body = modeSchema.parse(req.body);
      await service.setMode(body.mode, body.bandwidthHz);
      return ok(service.getState());
    } catch (e: any) {
      rep.status(400);
      return fail(e.message ?? "invalid payload");
    }
  });

  app.post("/api/radio/power", async (req, rep) => {
    try {
      const body = powerSchema.parse(req.body);
      await service.setPower(body.percent);
      return ok(service.getState());
    } catch (e: any) {
      rep.status(400);
      return fail(e.message ?? "invalid payload");
    }
  });

  app.post("/api/radio/ptt", async (req, rep) => {
    try {
      const body = pttSchema.parse(req.body);
      await service.setPtt(body.ptt);
      return ok(service.getState());
    } catch (e: any) {
      rep.status(400);
      return fail(e.message ?? "invalid payload");
    }
  });
}

