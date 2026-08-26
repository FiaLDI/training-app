import path from 'path'

import cors from 'cors'
import express, { type Express } from 'express'

import { createHealthHttpController } from './modules/health/controller/health.http-controller'
import { createUploadHttpController } from './modules/upload/controller/upload.http-controller'
import type { AuthPort } from './modules/upload/core/ports/auth.port'
import type { UploadFileUseCase } from './modules/upload/core/use-cases/upload-file/upload-file.use-case'
import type { AppConfig } from './shared/config/env'

type Deps = {
  config: AppConfig
  uploadFileUseCase: UploadFileUseCase
  auth: AuthPort
}

export function createApp(deps: Deps): Express {
  const app = express()
  const uploadDir = path.resolve(deps.config.uploadDir)

  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  )

  app.use(createHealthHttpController())
  app.use(
    createUploadHttpController({
      uploadFileUseCase: deps.uploadFileUseCase,
      auth: deps.auth,
      maxBytes: deps.config.maxBytes,
      maxFiles: deps.config.maxFiles,
    }),
  )

  app.use(
    deps.config.publicPath,
    express.static(uploadDir, { fallthrough: false, index: false }),
  )

  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(err)
      res.status(500).json({ message: 'Внутренняя ошибка upload-сервиса' })
    },
  )

  return app
}
