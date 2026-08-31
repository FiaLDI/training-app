# Индексация модулей и архитектура IronLog

В данном документе приведена полная карта модулей бэкенда (NestJS) и фронтенда (Next.js FSD), их ответственность и ключевые связи.

---

## 1. Backend Архитектура (NestJS)

Бэкенд спроектирован по принципам Clean Architecture / Ports & Adapters (Гексагональная архитектура):
* controller/: HTTP-контроллеры, маршруты, DTO, Swagger-аннотации.
* core/entity/: Бизнес-сущности и модели домена.
* core/ports/: Интерфейсы репозиториев и внешних сервисов.
* core/use-cases/: Сценарии использования (UseCase) с изолированной бизнес-логикой.
* infrastructure/: Реализации репозиториев (TypeORM), внешние адаптеры, гарды.

### Карта модулей Backend (backend/src/modules/)

| Модуль | Назначение и функции | Основные Use Cases / Эндпоинты |
|---|---|---|
| `auth` | Аутентификация, профиль, JWT, Guard'ы, кеш профиля и отзыв сессий (`AuthSessionService`), хеширование login-кодов (`LoginCodeService`: HMAC lookup + bcrypt), админ-выдача/сброс кодов. | • RegisterUseCase / LoginUseCase / GetMeUseCase<br>• ListUsersUseCase, CreateUserByAdminUseCase, ResetLoginCodeUseCase |
| `training` | Управление тренировками, логирование упражнений и подходов (сет), расчет рабочих весов. | • CreateTrainingUseCase, GetTrainingUseCase<br>• CreateTrainingSetUseCase, UpdateTrainingSetUseCase<br>• CreateTrainingExerciseUseCase, DeleteTrainingExerciseUseCase |
| `template` | Шаблоны тренировок (состав упражнений, целевой вес, повторения/подходы). | • CreateTemplateUseCase, ListTemplatesUseCase<br>• CreateTemplateExerciseUseCase, UpdateTemplateExerciseUseCase |
| `program` | Программы тренировок, расписание сплитов по дням недели, генерация недельного плана. | • CreateProgramUseCase, ListProgramsUseCase<br>• CreateProgramDayUseCase, UpdateProgramDayUseCase<br>• ApplyProgramUseCase (заполнение недели) |
| `exercise` | Каталог упражнений: системные (`user_id IS NULL`, read для всех auth, write admin) и кастомные (`user_id = owner`, CRUD владельца). List/get всегда с `AuthGuard` и фильтром `system ∪ mine`. | • CreateExerciseUseCase, ListExercisesUseCase<br>• GetExerciseUseCase, UpdateExerciseUseCase, DeleteExerciseUseCase |
| `body-measurement`| Замеры тела (масса тела, дата замера, динамика). | • CreateBodyMeasurementUseCase<br>• ListBodyMeasurementsUseCase<br>• GetLatestBodyMeasurementUseCase |
| `stats` | Аналитический модуль: подсчет суммарного объема (тоннажа), рабочих подходов и прогресса по упражнениям. | • GetVolumeStatsUseCase<br>• GetExerciseProgressUseCase |
| `source` | Медиа к упражнениям; владение наследуется от exercise (auth + visibility/canEdit). | • CreateSourceUseCase, ListSourcesUseCase<br>• CreateTimecodeUseCase, ListTimecodesUseCase |
| `feedback` | Обратная связь пользователей: отправка сообщений об ошибках, предложений и админская модерация. | • CreateFeedbackUseCase<br>• ListFeedbackUseCase, UpdateFeedbackStatusUseCase |

### Общий слой Backend (backend/src/shared/)

* `config`: глобальный `ConfigModule` (@nestjs/config) для чтения переменных окружения.
* `logger`: структурное логирование (nestjs-pino).
* `database`: подключение TypeORM к PostgreSQL.
* `cache`: разделяемое состояние (не кеш SQL-запросов). `CachePort` в `core/ports` + два адаптера в `infrastructure`: `RedisCacheAdapter` (ioredis) и `MemoryCacheAdapter`. Глобальный `CacheModule` выбирает адаптер по `REDIS_URL` / `REDIS_HOST`. Graceful degradation: при недоступности Redis адаптер прозрачно переключается на in-memory, приложение не отдаёт 5xx. Метод `increment` реализован и в fallback — иначе rate-limiting молча открылся бы (fail-open).
* `rate-limit`: декоратор `@RateLimit({ limit, windowSeconds, name })` + `RateLimitGuard`. Ключ — `rl:{name}:{IP}`, ответ 429 с заголовками `RateLimit-*` и `Retry-After`. Требует `app.set('trust proxy', 1)` в `main.ts`: без этого за nginx все клиенты попадают в один бакет.

### Ключи в Redis

| Ключ | Назначение | TTL |
|---|---|---|
| `auth:user:{userId}` | Кеш профиля для `AuthGuard` (без credentials) | `AUTH_USER_CACHE_TTL_SECONDS`, по умолчанию 300 с |
| `auth:revoked-at:{userId}` | Отзыв **всех** сессий (зеркало `users.sessions_revoked_at`) | 30 дней (срок жизни токена) |
| `auth:revoked-token:{sha256(token)}` | Отзыв одного токена (логаут) | Остаток жизни токена |
| `rl:{name}:{ip}` | Счётчик rate-limiting по IP | Окно правила |
| `rl:auth-login-user:{userId}` | Счётчик неудачных/попыток login по аккаунту | 15 мин |

---

## 2. Frontend Архитектура (Next.js FSD)

Фронтенд структурирован по методологии Feature-Sliced Design (FSD):
* app/: Next.js App Router (маршрутизация, layout, страницы-обертки).
* views/: Полноценные экранные композиции страниц.
* widgets/: Крупные композиционные блоки интерфейса (лейаут приложения, сайдбар, навигация).
* features/: Пользовательские сценарии и интерактивные действия (формы создания, модалки, синхронизация).
* entities/: Бизнес-сущности (состояние Zustand, API-клиенты, базовые UI-карточки).
* shared/: Переиспользуемый UI-кит, утилиты форматирования, базовый HTTP-клиент, локальное хранилище.

### Карта слоев Frontend (frontend/src/)

#### 2.1. Страницы и экраны (app/ & views/)
| Роут (app/) | View (views/) | Описание экрана |
|---|---|---|
| / | DashboardPage (views/dashboard) | Экран «Сегодня» — старт/продолжение тренировки, статус дня. |
| /week | WeekPage (views/week) | Интерактивный недельный календарь планирования. |
| /plan | → /week | Legacy-редирект (бывший URL календаря недели). |
| /plans | TemplatesPage (views/templates) | Каталог шаблонов тренировок («Планы»). |
| /plans/[id] | TemplateDetailPage (views/templates) | Детальная страница шаблона с редактором упражнений. |
| /templates, /templates/[id] | → /plans, /plans/[id] | Legacy-редиректы. |
| /programs, /programs/[id] | → /week | Legacy-редиректы. |
| /trainings | → /week | Legacy-редирект списка; сессии живут по `/trainings/[id]`. |
| /trainings/[id] | TrainingSessionPage (views/trainings) | Интерактивный экран проведения тренировки (степпер, сеты). |
| /exercises | ExercisesPage (views/exercises) | Каталог упражнений с поиском. |
| /exercises/[id] | ExerciseDetailPage (views/exercises) | Детальная страница упражнения. |
| /stats | StatsPage (views/stats) | Аналитика (Обзор, Прогресс, Тренировки, Вес). |
| /settings | SettingsPage (views/settings) | Настройки сессии, синхронизация, шаги весов, профиль. |
| /admin | → /admin/users | Редирект в админ-панель. |
| /admin/users | AdminUsersPage (views/admin) | Админ-панель → Пользователи (только role=admin). |
| /login | LoginPage (views/login) | Вход по коду, выбор локального режима, регистрация. |
| /help | HelpPage (views/help) | Форма обратной связи и админский инбокс. |

#### 2.2. Фичи (features/)

* `add-training-exercise`: Модальное окно добавления упражнения в текущую тренировку.
* `auth-gate`: Контроль доступа к приватным страницам и проверка авторизации/локального режима.
* `clear-local-data`: Очистка локальных данных устройства из настроек.
* `create-exercise` / `edit-exercise`: Формы создания и редактирования упражнений.
* `create-program`: Форма создания тренировочной программы.
* `create-template` / `edit-template-exercise`: Создание шаблонов и редактирование упражнений в шаблоне.
* `edit-set` / `log-set`: Логирование и редактирование подходов (вес, повторения, RPE, разминка).
* `edit-set-steps`: Настройка индивидуального шага инкремента веса/повторений.
* `edit-training` / `edit-training-exercise`: Редактирование параметров сессии и состава упражнений.
* `log-body-weight`: Быстрый ввод массы тела.
* `moderate-feedback` / `send-feedback`: Отправка фидбека и админское управление тикетами.
* `remove-training-exercise`: Удаление упражнения из тренировочной сессии.
* `start-training`: Быстрый запуск тренировки из шаблона или пустой сессии.
* `sync-trainings`: Модуль синхронизации (фоновый воркер background-sync, баннеры sync-pending-banner, модалка sync-trainings-dialog, исходящая очередь delete-outbox).

#### 2.3. Сущности (entities/)

* `training`: Модели, Zustand-стор, API и UI статусов/календаря тренировок.
* `template`: Модели, Zustand-стор, API и карточки шаблонов.
* `program`: Модели, Zustand-стор, API программ.
* `exercise`: Модели, Zustand-стор, API, комбобокс и карточки упражнений.
* `body-measurement`: Модели, API и графики массы тела.
* `stats`: API статистики, хук useLastFinishedTraining, графики SimpleBarChart.
* `session`: Zustand-стор аутентификации (токен, локальный/облачный режим, профиль).
* `source`: API работы с медиа-источниками и видео.
* `feedback`: Модели и API обратной связи.

#### 2.4. Общий слой (shared/)

* `shared/ui`: Базовые UI компоненты (Button, Input, Select, Modal, ConfirmModal, Skeleton, NumberStepper, PageHeader, EmptyState).
* `shared/api`: Настроенный HTTP клиент Axios / Fetch с перехватчиками токенов.
* `shared/lib`: утилиты дат, форматирования чисел/весов (format.ts), объединения CSS-классов (cn.ts), метаданных синхронизации и офлайн-хранилища (`offline-db.ts` / Dexie IndexedDB, `local-data.ts`).

---

## 3. Схема взаимодействия данных (Data Flow)
[Пользователь]
       │
       ▼
[Next.js UI (Views / Features)]
       │
   ┌───┴──────────────────────────────┐
   │                                  │ (Локальный режим / Оффлайн)
   ▼                                  ▼
[Zustand Stores] ─────────────► [IndexedDB (Dexie) + WAL]
   │                                  │
   │ (Облачный режим / Online)        │ (Отложенная синхронизация)
   ▼                                  │
[Axios API Client] ◄──────────────────┘
       │
       ▼ (HTTP / Nginx)
[NestJS Controllers]
       │
       ▼
[AuthGuard] ◄──────────────► [Redis: user-кеш, отзыв JWT, rate-limit]
       │                       (при недоступности — fallback на память, без 5xx)
       ▼
[Core UseCases]
       │
       ▼
[TypeORM Repository Ports]
       │
       ▼
[PostgreSQL Database]
