import 'reflect-metadata'

import { loadEnv } from './load-env'

loadEnv()

import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import cookieParser from 'cookie-parser'
import { Logger } from 'nestjs-pino'

import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true })

  app.useLogger(app.get(Logger))
  app.use(cookieParser())
  app.enableCors({
    origin: [
      'http://192.168.1.67:3001',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://localhost:8080',
      'http://127.0.0.1:8080',
      'http://192.168.1.67:8080',
    ],
    credentials: true,
  })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  const config = new DocumentBuilder()
    .setTitle('Training App API')
    .setDescription('Workout tracking API')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, document)

  const port = Number(process.env.PORT ?? 3000)
  await app.listen(port, '0.0.0.0')
}

bootstrap()
