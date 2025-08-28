import type { FastifyInstance } from 'fastify';
import type { RadioService } from '../services/radio.js';

export async function radioRoutes(fastify: FastifyInstance, opts: { radio: RadioService }) {
  const { radio } = opts;
  const handler = async () => ({ success: true, data: radio.getState() });
  fastify.get('/api/radio/state', handler);
  fastify.get('/api/radio/status', handler);

  fastify.get('/api/radio/caps', async () => {
    const caps = await (radio as any).adapter?.getCapabilities?.();
    return { success: true, data: caps || { levels: [], funcs: [], modes: [], vfos: [], supports: { setFrequency: true, setMode: true, setPower: false, setPTT: true } } };
  });
}
