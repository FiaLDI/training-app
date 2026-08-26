import 'express'

import type { AuthUser } from '../modules/upload/core/types'

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser
    }
  }
}

export {}
