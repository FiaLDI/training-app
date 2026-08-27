import { Controller, Get, Inject } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'

import { CACHE_PORT, CachePort } from '../../shared/cache/core/ports/cache.port'

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@Inject(CACHE_PORT) private readonly cache: CachePort) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        cache: { type: 'string', enum: ['redis', 'memory-fallback'] },
      },
    },
  })
  check() {
    // Always 200: a cache outage is degraded, not unhealthy, so the container
    // healthcheck must not restart a working backend.
    return {
      status: 'ok',
      cache: this.cache.isHealthy() ? 'redis' : 'memory-fallback',
    }
  }
}
