import type { FastifyInstance } from 'fastify'
import { tenantStatusRoutes } from './status.js'

export async function tenantRoutes(app: FastifyInstance): Promise<void> {
  app.register(tenantStatusRoutes)
}
