# Интеграция нативных клиентов IronLog с API

Документ для **локальных нативных приложений** (Compose, SwiftUI, Flutter) и гибридов, которые вызывают backend напрямую. Обёртки над веб-UI API не требуют — достаточно PWA.

См. также: [native-apps.md](./native-apps.md) (архитектура клиента, стеки по платформам).

---

## Базовые URL

| Среда | Frontend | API |
|-------|----------|-----|
| Production | `https://your-domain.example/` | `https://your-domain.example/api` |
| Локальная разработка | `http://localhost:3001` | `http://localhost:3001/api` (proxy → `:3000`) |
| Backend напрямую | — | `http://localhost:3000/api` |

Префикс всех эндпоинтов: **`/api`**. Swagger UI: **`GET /api/docs`**.

Health check (без auth):

```http
GET /api/health
```

```json
{ "status": "ok", "cache": "redis" }
```

---

## Аутентификация

IronLog использует **постоянный login-код** (12 символов) + **JWT**. Паролей и SMTP нет.

### Регистрация

```http
POST /api/auth/register
Content-Type: application/json

{ "email": "user@example.com" }
```

Ответ (новый аккаунт):

```json
{
  "email": "user@example.com",
  "created": true,
  "loginCode": "XXXXXXXXXXXX",
  "message": "Account created. Copy the login code now — it will not be shown again."
}
```

Если email уже существует — `loginCode` **не возвращается** (`created: false`).

Rate limit: **5 запросов / час / IP**.

### Вход

```http
POST /api/auth/login
Content-Type: application/json

{ "code": "XXXXXXXXXXXX" }
```

Ответ:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "user",
    "role": "user",
    "metadata": {},
    "createdAt": "2026-01-01T00:00:00.000Z"
  },
  "accessToken": "eyJ..."
}
```

Параллельно backend выставляет httpOnly cookie `access_token` — **нативным клиентам достаточно `accessToken` из JSON**.

Rate limit: **10 / 15 мин / IP** + **5 / 15 мин / аккаунт** после lookup.

### Авторизованные запросы

```http
Authorization: Bearer eyJ...
Content-Type: application/json
```

JWT хранить в:

- **Android:** EncryptedSharedPreferences / DataStore
- **iOS:** Keychain
- **Flutter:** flutter_secure_storage

Срок жизни токена — см. `TOKEN_TTL_SECONDS` в backend (по умолчанию ~30 дней). При **401** — очистить токен и показать экран login.

### Текущий пользователь

```http
GET /api/auth/me
Authorization: Bearer …
```

### Выход

```http
POST /api/auth/logout
Authorization: Bearer …
```

Отзывает текущий токен на сервере.

### Admin (role = admin)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/auth/admin/users` | Список пользователей (без кодов) |
| POST | `/api/auth/admin/users` | Создать пользователя + код один раз |
| POST | `/api/auth/admin/users/:id/reset-code` | Сброс кода + отзыв всех сессий |

---

## Формат запросов и ошибок

- Тело: **JSON**, `Content-Type: application/json`
- UUID в path/body: формат v4
- ValidationPipe: лишние поля в body → **400**
- Ошибки NestJS:

```json
{
  "statusCode": 404,
  "message": "Training not found",
  "error": "Not Found"
}
```

| Код | Действие клиента |
|-----|------------------|
| 401 | Logout, экран login |
| 403 | Показать «нет доступа» |
| 404 | Сущность не найдена / удалена на сервере |
| 409 | Конфликт (редко) |
| 429 | Backoff, показать «слишком много попыток» |
| 5xx | Retry с экспоненциальной задержкой |

Таймаут записи при sync (как в веб-клиенте): **12 с** на один HTTP write.

---

## Каталог API

Все маршруты ниже требуют `Authorization: Bearer`, кроме `auth/register`, `auth/login`, `health`.

### Trainings — `/api/trainings`

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/trainings?page&limit&status&from&to` | Список |
| GET | `/trainings/:id` | Тренировка + exercises + sets |
| POST | `/trainings` | Создать (опционально клиентский `id`) |
| PATCH | `/trainings/:id` | Обновить |
| DELETE | `/trainings/:id` | Удалить |
| POST | `/trainings/:id/exercises` | Добавить упражнение в сессию |
| PATCH | `/trainings/exercises/:exerciseId` | Обновить training exercise |
| DELETE | `/trainings/exercises/:exerciseId` | Убрать из сессии |
| POST | `/trainings/exercises/:exerciseId/sets` | Добавить подход |
| PATCH | `/trainings/sets/:setId` | Обновить подход |
| DELETE | `/trainings/sets/:setId` | Удалить подход |

`status`: `planned` | `in_progress` | `finished` | `cancelled`.

### Exercises — `/api/exercises`

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/exercises?page&limit&search` | Системные + свои |
| GET | `/exercises/:id` | Одно упражнение |
| POST | `/exercises` | Кастомное упражнение |
| PATCH | `/exercises/:id` | Обновить (только своё) |
| DELETE | `/exercises/:id` | Удалить (только своё) |

### Templates — `/api/templates`

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/templates` | Список шаблонов |
| GET | `/templates/:id` | Шаблон + exercises |
| POST | `/templates` | Создать |
| PATCH | `/templates/:id` | Обновить |
| DELETE | `/templates/:id` | Удалить |
| POST | `/templates/:id/exercises` | Упражнение в шаблон |
| PATCH | `/templates/exercises/:exerciseId` | Обновить |
| DELETE | `/templates/exercises/:exerciseId` | Удалить |

### Programs — `/api/programs`

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/programs` | Список программ |
| GET | `/programs/:id` | Программа + days |
| POST | `/programs` | Создать |
| PATCH | `/programs/:id` | Обновить |
| DELETE | `/programs/:id` | Удалить |
| POST | `/programs/:id/days` | День программы |
| PATCH | `/programs/days/:dayId` | Обновить день |
| DELETE | `/programs/days/:dayId` | Удалить день |
| POST | `/programs/:id/apply` | Применить к неделе |

### Sources (медиа) — `/api/sources`

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/sources?exerciseId=` | Список |
| GET | `/sources/:id` | Один source |
| POST | `/sources` | Создать |
| PATCH | `/sources/:id` | Обновить |
| DELETE | `/sources/:id` | Удалить |
| GET | `/sources/:id/timecodes` | Таймкоды |
| POST | `/sources/:id/timecodes` | Добавить таймкод |
| PATCH | `/sources/timecodes/:timecodeId` | Обновить |
| DELETE | `/sources/timecodes/:timecodeId` | Удалить |

### Body measurements — `/api/body-measurements`

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/body-measurements?from&to` | Замеры |
| POST | `/body-measurements` | Добавить |
| DELETE | `/body-measurements/:id` | Удалить |

### Stats — `/api/stats`

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/stats/volume?from&to` | Объём за период |
| GET | `/stats/exercise-progress?exerciseId&from&to` | Прогресс по упражнению |

### Feedback — `/api/feedback`

Категории: `bug`, `idea`, `question`, `feature`, `ui`, `complaint`, `other`.
Статусы: `new`, `read`, `resolved`. Приоритет: `low`, `normal`, `high` (по умолчанию `normal`).

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/feedback` | Отправить |
| GET | `/feedback` | Свои сообщения |
| GET | `/feedback/inbox?page&limit&q&status&priority&category&sort&order` | Admin inbox. Ответ `{ items, total, page, limit }`. `authorEmail` или `null`. Поиск `q` по тексту и почте. Фильтры: `status`, `priority`, `category`. `sort`: `default` (нерешённые, приоритет, дата) \| `createdAt` \| `priority` \| `status`. `order`: `asc` \| `desc` (для `default` игнорируется). Локальный режим — автор анонимный |
| PATCH | `/feedback/:id/resolve` | Admin: статус → `resolved` |
| PATCH | `/feedback/:id` | Admin: `{ status?, priority? }`. `status: "read"` снимает «решено»; `status: "new"` — непрочитано |
| DELETE | `/feedback/:id` | Admin, только `resolved` |

### Uploads — `/api/uploads`

```http
POST /api/uploads
Authorization: Bearer …
Content-Type: multipart/form-data

file=<binary>
```

Ответ:

```json
{
  "url": "/upload/…",
  "filename": "…",
  "size": 12345,
  "mimeType": "image/jpeg",
  "originalName": "photo.jpg"
}
```

Upload-сервис может быть на отдельном порту (`3002`); через frontend proxy путь тот же `/api/uploads`.

---

## Модели данных (ключевые поля)

### Training

```typescript
{
  id: string              // UUID, клиент может задать при POST
  templateId: string | null
  programId: string | null
  programDayId: string | null
  status: 'planned' | 'in_progress' | 'finished' | 'cancelled'
  scheduledAt: string | null   // ISO 8601
  startedAt: string | null
  finishedAt: string | null
  notes: string | null
  metadata: Record<string, unknown>
  createdAt: string
}
```

### TrainingExercise

```typescript
{
  id: string
  trainingId: string
  exerciseId: string       // ссылка на catalog exercise
  exerciseOrder: number
  targetSets: number
  isWarmup: boolean
  minReps: number | null
  maxReps: number | null
  maxWeight: number | null
  previousMaxWeight: number | null
  restSeconds: number | null
  notes: string | null
  metadata: Record<string, unknown>
}
```

### TrainingSet

```typescript
{
  id: string
  trainingExerciseId: string
  setNumber: number
  weight: number | null
  reps: number | null
  rir: number | null
  rpe: number | null
  completed: boolean
  isWarmup: boolean
  metadata: Record<string, unknown>
  createdAt: string
}
```

Полные DTO — в Swagger (`/api/docs`) и в `backend/src/modules/*/controller/dto/`.

---

## Scope и изоляция данных

Веб-клиент разделяет локальные данные по scope:

| Режим | Scope key | Описание |
|-------|-----------|----------|
| Local-only | `local` | Без userId |
| Cloud | `cloud:{userId}` | После login |

При **logout / смене пользователя** нативный клиент должен:

1. Очистить in-memory state
2. Удалить или изолировать SQLite-файл / таблицы текущего scope
3. Сбросить JWT

Референс: `frontend/src/shared/lib/storage-scope.ts`, `frontend/src/entities/session/lib/session-boundary.ts`.

---

## Офлайн и синхронизация (cloud mode)

Логика зеркалирует веб-клиент (`frontend/src/features/sync-trainings/`).

### Принцип: local-first

1. Любое действие (log set, finish training) → **сначала локальная БД**
2. Пометить сущность `metadata.sync.status = "pending"`
3. При наличии сети — **SyncWorker** загружает на сервер
4. После успеха — `status = "synced"`, сохранить `contentHash`

### Sync metadata

```typescript
type TrainingSyncMeta = {
  status: 'pending' | 'synced' | 'error'
  reason?: 'local_mode' | 'queued' | 'timeout' | 'network' | 'server'
  serverSyncedAt?: string
  contentHash?: string    // fingerprint uploadable content
  error?: string
  failedAt?: string
}
```

Хранится в `training.metadata.sync` (JSON).

### Content hash

Fingerprint тренировки для определения «нужен ли re-upload». Алгоритм — `trainingContentHash()` в `frontend/src/shared/lib/training-sync-meta.ts`: стабильная JSON-сериализация training + exercises + sets (без поля `sync`).

### Алгоритм upload одной тренировки

Порядок важен (см. `sync-trainings.ts`):

```
1. ensureTrainingShell(training)
   a. GET /trainings/:id — если 404, POST /trainings с клиентским id
   b. PATCH /trainings/:id — статус, даты, notes
   c. templateId: сначала null при create, потом PATCH (избегает дублирования exercise ids)

2. Для каждого training exercise:
   a. POST /trainings/:id/exercises (idempotent по id)
   b. PATCH /trainings/exercises/:exerciseId (whitelist полей, без exerciseId в PATCH)

3. Для каждого set:
   a. POST …/sets (idempotent)
   b. PATCH /trainings/sets/:setId

4. markTrainingSynced(id, contentHash)
```

**Важно:** POST create/set/exercise **идемпотентны по клиентскому UUID** — повтор upload безопасен.

### Каталог (exercises, templates)

Перед upload тренировок синхронизируйте зависимости:

- Кастомные exercises без `metadata.catalogSyncedAt` → POST `/exercises`, затем пометить synced
- Templates — аналогично (`catalog-sync.ts`)

### Retry policy

| Ошибка | Действие |
|--------|----------|
| Timeout / network / 5xx | Retry, max ~5 попыток, backoff |
| 400 / 404 на PATCH set | Игнорировать (create уже применил поля) |
| 401 | Stop sync, re-login |

### Local-only mode

- API **не вызывается**
- `metadata.sync.reason = "local_mode"` или sync meta отсутствует
- При первом login — `backfillPendingSync`: все локальные тренировки → `pending`, затем upload

---

## Сценарии (пошагово)

### A. Первый запуск без аккаунта

```
1. AppMode = LOCAL
2. Создать training локально (UUID v4)
3. Log sets → Room/SwiftData
4. UI: badge «только на этом устройстве»
```

### B. Login и upload локальных данных

```
1. POST /auth/login → сохранить accessToken, user.id
2. AppMode = CLOUD, scope = cloud:{userId}
3. Найти все trainings где sync.status != synced
4. Для каждой — алгоритм upload (§ выше)
5. GET /trainings?from=… — optional pull для других устройств
```

### C. Активная тренировка в зале без сети

```
1. GET /trainings/:id из локальной БД
2. PATCH sets локально после каждого подхода
3. Rest timer — нативные notifications
4. При появлении сети — SyncWorker
```

### D. Новое устройство, существующий аккаунт

```
1. Login
2. GET /exercises, /templates — pull catalog
3. GET /trainings?limit=100&from=… — pull history
4. Merge в локальную БД (upsert by id)
5. Новые записи на этом устройстве → upload по мере создания
```

---

## Особенности нативных клиентов vs браузер

| Тема | Браузер | Нативный клиент |
|------|---------|-----------------|
| CORS | Нужен allowlist origin | **Не применяется** — прямой вызов API |
| Cookie | httpOnly `access_token` | Только Bearer header |
| Offline storage | IndexedDB (Dexie) | SQLite / Room / SwiftData |
| Background sync | Background Sync API (ограничено) | WorkManager / BGTaskScheduler |
| Rate limit | По IP устройства | То же — учитывайте retry |

Production CORS сейчас разрешает origins frontend-dev; для **standalone native app** вызывайте API напрямую по HTTPS (`https://api.your-domain.example/api` или тот же host через nginx).

---

## Пример: Kotlin (Ktor)

```kotlin
class IronLogApi(private val client: HttpClient, private val tokenStore: TokenStore) {

    suspend fun login(code: String): AuthSession {
        return client.post("$baseUrl/auth/login") {
            contentType(ContentType.Application.Json)
            setBody(LoginRequest(code))
        }.body()
    }

    suspend fun getTraining(id: UUID): TrainingWithDetails =
        client.get("$baseUrl/trainings/$id") {
            bearerAuth(tokenStore.accessToken())
        }.body()

    suspend fun createSet(exerciseId: UUID, input: CreateSetInput): TrainingSet =
        client.post("$baseUrl/trainings/exercises/$exerciseId/sets") {
            bearerAuth(tokenStore.accessToken())
            contentType(ContentType.Application.Json)
            setBody(input)
        }.body()
}
```

---

## Пример: Swift

```swift
func login(code: String) async throws -> AuthSession {
    var request = URLRequest(url: baseURL.appending(path: "/auth/login"))
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONEncoder().encode(["code": code])
    let (data, response) = try await URLSession.shared.data(for: request)
    guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw APIError.unauthorized }
    return try JSONDecoder().decode(AuthSession.self, from: data)
}
```

---

## Пример: curl (отладка)

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"code":"YOUR_CODE_HERE"}' | jq -r .accessToken)

# List trainings
curl -s "http://localhost:3000/api/trainings?limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq

# Create training with client id
curl -s -X POST http://localhost:3000/api/trainings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "planned",
    "scheduledAt": "2026-08-28T10:00:00.000Z"
  }' | jq
```

---

## Чеклист интеграции

- [ ] Bearer token в secure storage
- [ ] Local-first writes + sync queue
- [ ] Client-generated UUID для trainings/exercises/sets
- [ ] Upload training: shell → exercises → sets (порядок из § Sync)
- [ ] `contentHash` после успешного upload
- [ ] Wipe scoped data on logout / user switch
- [ ] 401 → force re-login
- [ ] 429 / 5xx → backoff, не спамить API в зале
- [ ] Health check перед массовым sync
- [ ] Swagger `/api/docs` для актуальных DTO при обновлении backend

---

## Связанные файлы в репозитории

| Файл | Назначение |
|------|------------|
| `backend/src/main.ts` | Prefix `/api`, Swagger, CORS |
| `backend/src/modules/auth/controller/` | Auth endpoints |
| `frontend/src/shared/api/client.ts` | HTTP client, Bearer, 401 handling |
| `frontend/src/features/sync-trainings/model/sync-trainings.ts` | Upload algorithm |
| `frontend/src/shared/lib/training-sync-meta.ts` | contentHash, pending status |
| `frontend/src/shared/lib/catalog-sync.ts` | Sync exercises/templates |
| `frontend/src/shared/lib/local-data.ts` | Local data model (reference schema) |
