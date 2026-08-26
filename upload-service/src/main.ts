import path from 'path'

import { createApp } from './app'
import { UploadFileUseCase } from './modules/upload/core/use-cases/upload-file/upload-file.use-case'
import { BackendAuthAdapter } from './modules/upload/infrastructure/backend-auth.adapter'
import { FsFileStorage } from './modules/upload/infrastructure/fs-file-storage'
import { loadConfig } from './shared/config/env'
import { loadEnv } from './shared/config/load-env'

async function bootstrap() {
  const envPath = loadEnv()
  const config = loadConfig()
  const uploadDir = path.resolve(config.uploadDir)

  const storage = new FsFileStorage(uploadDir, config.publicPath)
  await storage.ensureReady()

  const auth = new BackendAuthAdapter(config.backendUrl)
  const uploadFileUseCase = new UploadFileUseCase(storage)
  const app = createApp({ config, uploadFileUseCase, auth })

  app.listen(config.port, '0.0.0.0', () => {
    console.log(
      `upload-service listening on :${config.port}, dir=${uploadDir}, public=${config.publicPath}, backend=${config.backendUrl}${envPath ? `, env=${envPath}` : ''}`,
    )
  })
}

bootstrap().catch((error) => {
  console.error('Failed to start upload-service', error)
  process.exit(1)
})
