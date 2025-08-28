import { EventEmitter } from "node:events";
import { z } from "zod";

const RuntimeConfigSchema = z.object({
  BACKEND_PORT: z.coerce.number().default(3001),
  RIGCTLD_HOST: z.string().default("127.0.0.1"),
  RIGCTLD_PORT: z.coerce.number().default(4532),
});
export type RuntimeConfig = z.infer<typeof RuntimeConfigSchema>;

export class ConfigService extends EventEmitter {
  private current: RuntimeConfig = RuntimeConfigSchema.parse({});

  get(): RuntimeConfig {
    return this.current;
  }

  update(patch: Partial<RuntimeConfig>) {
    const merged = { ...this.current, ...patch };
    this.current = RuntimeConfigSchema.parse(merged);
    this.emit("config_updated", this.current);
  }
}

