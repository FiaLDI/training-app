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

## HTTPS по IP (Let's Encrypt)

Nginx и Certbot шарят сертификаты через volume. Сертификат на IP живёт ~6 дней (`shortlived`).

1. В `.env` на VPS:

```bash
APP_PORT=80
HTTPS_PORT=443
CERTBOT_IP=YOUR_PUBLIC_IP
# CERTBOT_EMAIL=you@example.com   # optional
```

2. Порты `80` и `443` должны быть открыты с интернета на этот IP.

3. Поднять стек и выпустить сертификат:

```bash
npm run up
npm run ssl:issue
```

Открой `https://YOUR_PUBLIC_IP`.

4. Автообновление (cron на хосте, каждые 12 часов):

```bash
0 */12 * * * cd /path/to/training-app && npm run ssl:renew >> /var/log/workout-ssl-renew.log 2>&1
```

Пока настоящего сертификата нет, `npm run up` кладёт временный self-signed в `certbot/conf/live/ip/`, чтобы nginx мог слушать `:443`.

## Конфиг

Единый файл окружения в корне репозитория:

| Файл | Назначение |
|------|------------|
| [`.env.example`](.env.example) | Шаблон (в git) |
| [`.env`](.env) | Локальные значения (не коммитить) |

Docker Compose читает корневой `.env`. Backend при локальном запуске тоже подхватывает корневой `.env` (или `backend/.env`).

Основные переменные:

- `IMAGE_TAG` — тег образов `workout-backend` / `workout-frontend` (`local` при `npm run up --build`; на production выставляет Jenkins)
- `APP_PORT` / `HTTPS_PORT` — порты nginx на хосте (`80` / `443`)
- `CERTBOT_IP` — для `npm run ssl:issue` (`CERTBOT_EMAIL` опционален)
- `POSTGRES_*` / `DATABASE_URL` — база
- `JWT_SECRET` — секрет JWT
- `NEXT_PUBLIC_API_URL` / `API_PROXY_TARGET` — для локального `next dev` (в Docker API доступен как `/api`)

## Стек в Docker

```
browser → nginx:$APP_PORT / :$HTTPS_PORT
            ├─ /       → frontend:3001
            └─ /api    → backend:3000
                          └─ postgres:5432

certbot (profile: ssl) ↔ volume ↔ nginx (/etc/letsencrypt, /var/www/certbot)
```

Сервисы: `postgres`, `backend` (миграции при старте), `frontend`, `nginx`; `certbot` — по запросу (`ssl:issue` / `ssl:renew`).

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
| `npm run db:down` | Остановить Postgres |
| `npm run ssl:issue` | Выпустить LE-сертификат на `CERTBOT_IP` |
| `npm run ssl:renew` | Обновить сертификаты и reload nginx |
| `cd backend && npm run migration:run` | Миграции вручную |

## Админ

По умолчанию все пользователи с ролью `user`. Админку выдаём вручную по email — первый зарегистрированный пользователь админом не становится.

Команда к контейнеру Postgres (подставьте почту):

```bash
docker compose exec workout-postgres \
  psql -U postgres -d workout \
  -c "UPDATE users SET role = 'admin' WHERE lower(email) = lower('you@example.com');"
```

Если в `.env` меняли `POSTGRES_USER` / `POSTGRES_DB` — подставьте их вместо `postgres` / `workout`.

После `UPDATE` обновите страницу: приложение подтянет роль через `/auth/me`. Снять админку: `SET role = 'user'`.

Админ может добавлять/править упражнения в каталоге и закрывать/удалять (только `resolved`) сообщения обратной связи.

## CI/CD (Jenkins)

Production получает уже собранные образы `workout-backend` / `workout-frontend` по SSH (без Registry и без `docker build` на сервере). После успешного деплоя Jenkins удаляет локальный image и tar; на production хранятся текущий и предыдущий тег для rollback.

Подробности: [docs/jenkins-cicd.md](docs/jenkins-cicd.md).

## Структура

```
├── .env.example      # общий шаблон env
├── Jenkinsfile       # CI/CD pipeline
├── docker-compose.yml
├── docs/             # в т.ч. jenkins-cicd.md
├── nginx/            # reverse proxy
├── certbot/          # LE webroot + certificates (gitignored)
├── scripts/          # ssl + ci-deploy / ci-healthcheck
├── backend/          # NestJS API
└── frontend/         # Next.js UI
```
