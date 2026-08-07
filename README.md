# IronLog / training-app

Трекер тренировок: NestJS API + Next.js UI + Postgres, снаружи один вход через nginx.

## Быстрый старт (из коробки)

Нужны Docker и Docker Compose.

```bash
cp .env.example .env   # один раз
npm run up
```

`npm run up` сам создаст `.env` из `.env.example`, если файла ещё нет.

Открой:

- Приложение: [http://localhost](http://localhost) (порт `APP_PORT` в `.env`, по умолчанию `80`)
- Swagger: [http://localhost/api/docs](http://localhost/api/docs)
- Health: [http://localhost/api/health](http://localhost/api/health)

Остановка и логи:

```bash
npm run logs
npm run down
```

## Конфиг

Единый файл окружения в корне репозитория:

| Файл | Назначение |
|------|------------|
| [`.env.example`](.env.example) | Шаблон (в git) |
| [`.env`](.env) | Локальные значения (не коммитить) |

Docker Compose читает корневой `.env`. Backend при локальном запуске тоже подхватывает корневой `.env` (или `backend/.env`).

Основные переменные:

- `APP_PORT` — порт nginx на хосте
- `POSTGRES_*` / `DATABASE_URL` — база
- `JWT_SECRET` — секрет JWT
- `NEXT_PUBLIC_API_URL` / `API_PROXY_TARGET` — для локального `next dev` (в Docker API доступен как `/api`)

## Стек в Docker

```
browser → nginx:$APP_PORT
            ├─ /       → frontend:3001
            └─ /api    → backend:3000
                          └─ postgres:5432
```

Сервисы: `postgres`, `backend` (миграции при старте), `frontend`, `nginx`.

## Локальная разработка (без полного Docker)

1. Поднять только БД:

```bash
npm run db:up
```

2. Backend:

```bash
cd backend
npm ci
npm run start:dev
```

API: `http://localhost:3000/api`, Swagger: `http://localhost:3000/api/docs`

3. Frontend:

```bash
cd frontend
cp .env.example .env.local   # если ещё нет
npm ci
npm run dev
```

UI: `http://localhost:3001` (проксирует `/api` на backend через `API_PROXY_TARGET`).

## Полезные команды

| Команда | Что делает |
|---------|------------|
| `npm run up` | Сборка и запуск всего стека |
| `npm run down` | Остановка контейнеров |
| `npm run logs` | Логи всех сервисов |
| `npm run restart` | Пересборка с recreate |
| `npm run db:up` | Только Postgres |
| `cd backend && npm run migration:run` | Миграции вручную |

## Структура

```
├── .env.example      # общий шаблон env
├── docker-compose.yml
├── nginx/            # reverse proxy
├── backend/          # NestJS API
└── frontend/         # Next.js UI
```
