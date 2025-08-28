import type { FastifyInstance } from 'fastify';
import type { RadioService } from '../services/radio.js';

export async function radioRoutes(fastify: FastifyInstance, opts: { radio: RadioService }) {
  const { radio } = opts;
  const handler = async () => ({ success: true, data: radio.getState() });
  fastify.get('/api/radio/state', handler);
  fastify.get('/api/radio/status', handler);
}


