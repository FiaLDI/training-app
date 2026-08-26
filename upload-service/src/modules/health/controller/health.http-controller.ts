import type { Router } from 'express'
import { Router as createRouter } from 'express'

export function createHealthHttpController(): Router {
  const router = createRouter()
  router.get('/api/health', (_req, res) => {
    res.type('text').send('ok')
  })
  return router
}
