import { createParamDecorator, ExecutionContext } from '@nestjs/common'

import { User } from '../core/types'
import { AuthenticatedRequest } from '../infrastructure/auth.guard'

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>()
    return request.user as User
  },
)
