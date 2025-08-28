import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ok, fail } from "../response.js";
import type { ConfigService } from "../services/config.js";

const PatchSchema = z.object({
  BACKEND_PORT: z.coerce.number().optional(),
  RIGCTLD_HOST: z.string().optional(),
  RIGCTLD_PORT: z.coerce.number().optional(),
});

export async function configRoutes(app: FastifyInstance, cfg: ConfigService) {
  app.get("/api/config", async () => ok(cfg.get()));

  app.post("/api/config", async (req, rep) => {
    try {
      const body = PatchSchema.parse(req.body ?? {});
      cfg.update(body);
      return ok(cfg.get());
    } catch (e: any) {
      rep.status(400);
      return fail(e.message ?? "invalid config");
    }
  });

  app.post("/api/config/reset", async () => {
    cfg.update({});
    return ok(cfg.get());
  });
}

