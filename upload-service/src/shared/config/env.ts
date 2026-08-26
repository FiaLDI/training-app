import path from 'path'

export type AppConfig = {
  port: number
  uploadDir: string
  publicPath: string
  maxBytes: number
  maxFiles: number
  backendUrl: string
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const defaultUploadDir = path.resolve(process.cwd(), '..', 'upload')

  return {
    // Do not use shared PORT from repo .env (that is backend :3000).
    port: Number(env.UPLOAD_PORT ?? 3002),
    uploadDir: env.UPLOAD_DIR ?? defaultUploadDir,
    publicPath: env.UPLOAD_PUBLIC_PATH ?? '/upload',
    maxBytes: Number(env.UPLOAD_MAX_BYTES ?? 5 * 1024 * 1024),
    maxFiles: Number(env.UPLOAD_MAX_FILES ?? 100),
    // Local default; docker-compose overrides with http://backend:3000
    backendUrl: (env.BACKEND_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, ''),
  }
}
