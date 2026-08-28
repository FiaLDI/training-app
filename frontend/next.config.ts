import { withSerwist } from '@serwist/turbopack'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['192.168.1.67'],
  async rewrites() {
    const target = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:3000'
    const uploadTarget =
      process.env.UPLOAD_PROXY_TARGET ?? 'http://127.0.0.1:3002'
    return [
      {
        source: '/api/uploads',
        destination: `${uploadTarget}/api/uploads`,
      },
      {
        source: '/api/uploads/:path*',
        destination: `${uploadTarget}/api/uploads/:path*`,
      },
      {
        source: '/api/upload-health',
        destination: `${uploadTarget}/api/health`,
      },
      {
        source: '/upload/:path*',
        destination: `${uploadTarget}/upload/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${target}/api/:path*`,
      },
    ]
  },
}

export default withSerwist(nextConfig)
