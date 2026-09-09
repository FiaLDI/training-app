import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Inject,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'

import { AuthGuard } from '../../auth/infrastructure/auth.guard'
import { AdminGuard } from '../../auth/infrastructure/admin.guard'
import { ExportSystemExerciseSeedUseCase } from '../core/use-cases/export-seed/export-system-exercise-seed.use-case'
import { ImportSystemExerciseSeedUseCase } from '../core/use-cases/import-seed/import-system-exercise-seed.use-case'
import { ImportSystemExerciseSeedResponseDto } from './dto/import-system-exercise-seed-response.dto'

const ZIP_MAX_BYTES = 50 * 1024 * 1024

@ApiTags('admin-exercise-seed')
@ApiBearerAuth()
@UseGuards(AuthGuard, AdminGuard)
@Controller('admin/exercise-seed')
export class ExerciseSeedHttpController {
  constructor(
    @Inject(ExportSystemExerciseSeedUseCase)
    private readonly exportUseCase: ExportSystemExerciseSeedUseCase,
    @Inject(ImportSystemExerciseSeedUseCase)
    private readonly importUseCase: ImportSystemExerciseSeedUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Download zip of system exercises + primary images' })
  @Header('Content-Type', 'application/zip')
  async exportArchive(): Promise<StreamableFile> {
    const result = await this.exportUseCase.execute()
    return new StreamableFile(result.buffer, {
      type: 'application/zip',
      disposition: `attachment; filename="${result.filename}"`,
    })
  }

  @Post('import')
  @ApiOperation({ summary: 'Import system exercise zip (insert-only, skip id/name duplicates)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOkResponse({ type: ImportSystemExerciseSeedResponseDto })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: ZIP_MAX_BYTES } }),
  )
  async importArchive(
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<ImportSystemExerciseSeedResponseDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Загрузите zip-архив')
    }
    return this.importUseCase.execute({ bytes: file.buffer })
  }
}
