import type { NextFunction, Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import multer from 'multer'

import type { AuthPort } from '../core/ports/auth.port'
import { DomainError } from '../core/types'
import type { UploadFileUseCase } from '../core/use-cases/upload-file/upload-file.use-case'
import { createMemoryUpload, extractAccessToken } from '../infrastructure/http/multipart'

type Deps = {
  uploadFileUseCase: UploadFileUseCase
  auth: AuthPort
  maxBytes: number
  maxFiles: number
}

function mapError(error: unknown, res: Response): void {
  if (error instanceof DomainError) {
    const status =
      error.code === 'UNAUTHORIZED'
        ? 401
        : error.code === 'FORBIDDEN'
          ? 403
          : error.code === 'UPSTREAM'
            ? 502
            : 400
    res.status(status).json({ message: error.message })
    return
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ message: 'Файл слишком большой' })
      return
    }
    res.status(400).json({ message: error.message })
    return
  }

  if (error instanceof Error) {
    res.status(400).json({ message: error.message })
    return
  }

  res.status(500).json({ message: 'Внутренняя ошибка upload-сервиса' })
}

export function createUploadHttpController(deps: Deps): Router {
  const router = createRouter()
  const upload = createMemoryUpload(deps.maxBytes)

  async function requireAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const token = extractAccessToken(req)
      if (!token) {
        throw new DomainError('Нужна авторизация', 'UNAUTHORIZED')
      }
      req.authUser = await deps.auth.requireAdmin(token)
      next()
    } catch (error) {
      mapError(error, res)
    }
  }

  router.post('/api/uploads', requireAdmin, (req, res) => {
    upload.single('file')(req, res, async (err: unknown) => {
      if (err) {
        mapError(err, res)
        return
      }

      try {
        const file = req.file
          ? {
              originalName: req.file.originalname,
              mimeType: req.file.mimetype,
              size: req.file.size,
              buffer: req.file.buffer,
            }
          : null

        const stored = await deps.uploadFileUseCase.execute({
          file,
          maxBytes: deps.maxBytes,
          maxFiles: deps.maxFiles,
        })

        res.status(201).json(stored)
      } catch (error) {
        mapError(error, res)
      }
    })
  })

  return router
}
