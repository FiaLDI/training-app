# Jenkins CI/CD (вариант 3: image → SSH → production)

Поток без Docker Registry / GHCR:

```text
GitHub push → webhook → Jenkins
  → checkout → docker build
  → docker save | gzip → SCP
  → production: docker load → compose up --no-build
  → healthcheck → cleanup на Jenkins
```

> **Важно (один сервер):** если Jenkins в Docker с `/var/run/docker.sock` на той же машине, что и приложение, **нельзя** делать `docker compose up/down` из workspace Jenkins — это те же `container_name` (`workout-*`) и те же volume. Стадия smoke на агенте убрана; проверка — только на production в `ci-deploy.sh`.

При провале healthcheck на production: rollback на предыдущий `IMAGE_TAG`, Jenkins — **FAILURE**.

## Что меняется в проекте

| Файл | Роль |
|------|------|
| `Jenkinsfile` | Pipeline |
| `docker-compose.yml` | `image: workout-*:${IMAGE_TAG}` + `build:` для локальной разработки |
| `.env` / `.env.example` | `IMAGE_TAG` (на prod выставляет деплой) |
| `scripts/ci-deploy.sh` | load → up → healthcheck → rollback → безопасная очистка |
| `scripts/ci-healthcheck.sh` | ожидание HTTP 2xx |

Имена образов: `workout-backend:${BUILD_NUMBER}`, `workout-frontend:${BUILD_NUMBER}`, `workout-upload:${BUILD_NUMBER}`.  
Тег `latest` не используется как версия релиза.

## Требования

### Jenkins agent

- Docker + Docker Compose plugin/CLI (`docker compose`)
- `curl`, `gzip`, `ssh`, `scp`, `tar`
- Доступ к Docker socket (сборка и локальный smoke)

Jenkins **не** входит в `docker-compose.yml` приложения — это отдельный сервис.

Запуск в Docker (на хосте, где уже есть Docker):

```bash
docker run -d --name jenkins \
  -p 8080:8080 -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins/jenkins:lts
```

Образ `jenkins/jenkins:lts` **не содержит** Docker CLI. Сокет сам по себе недостаточно — поставь CLI внутри контейнера:

```bash
docker exec -u root jenkins bash -c '
  set -e
  apt-get update
  apt-get install -y ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian bookworm stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce-cli docker-compose-plugin
'

# Права на docker.sock (GID хоста)
SOCK_GID=$(stat -c '%g' /var/run/docker.sock)
docker exec -u root jenkins bash -c "groupadd -f -g ${SOCK_GID} dockerhost && usermod -aG dockerhost jenkins"
docker restart jenkins
```

Проверка:

```bash
docker exec -u jenkins jenkins docker version
docker exec -u jenkins jenkins docker compose version
```

- `-p 8080:8080` — UI и GitHub webhook (`/github-webhook/`)
- `-v /var/run/docker.sock:...` — сборка через Docker **хоста**
- данные Jenkins в volume `jenkins_home`

Открыть порт (пример для ufw):

```bash
sudo ufw allow 8080/tcp
sudo ufw reload
```

Если VPS за облачным firewall — добавь inbound TCP **8080** и там.

Первый вход:

```bash
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

Открой `http://<IP>:8080`, вставь пароль, поставь плагины (Pipeline, Git, GitHub, SSH Credentials).

### Production

- Docker + Compose
- Git-checkout (или дерево файлов) приложения, например `/opt/training-app`
- Файл `.env` (из `.env.example`, с боевыми секретами) — **не** из Jenkinsfile
- Отдельный пользователь деплоя (не root), например `deploy`
- SSH по ключу; пользователь в группе `docker` (или эквивалент без пароля)

## Jenkins Credentials

Создать в **Manage Jenkins → Credentials** (ID должны совпасть **один в один** с Jenkinsfile):

| ID | Тип в UI | Назначение |
|----|----------|------------|
| `production-ssh` | **SSH Username with private key** | пользователь + приватный ключ |
| `production-host` | **Secret text** | хост / IP, например `78.17.66.92` |
| `production-deploy-path` | **Secret text** | путь на сервере: **`/opt/training-app`** (не `/root/...`) |
| (опционально) GitHub creds | Username/password или GitHub App | если private repo |

Опционально в Job / Folder env:

- `DEPLOY_BRANCH` — ветка для деплоя (по умолчанию `develop`)

### Как завести `production-ssh`

На сервере (один раз):

```bash
# пользователь деплоя
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy

# ключ (можно в любом каталоге; не коммитить в git)
ssh-keygen -t ed25519 -f ./deploy_key -N "" -C "jenkins-deploy"

# каталог SSH у deploy
sudo mkdir -p /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh
sudo cat ./deploy_key.pub >> /home/deploy/.ssh/authorized_keys
sudo chmod 600 /home/deploy/.ssh/authorized_keys
sudo chown -R deploy:deploy /home/deploy/.ssh

# проверка
ssh -i ./deploy_key deploy@127.0.0.1 'echo ok'
```

В Jenkins → Add Credentials → **SSH Username with private key**:

- **ID:** `production-ssh`
- **Username:** `deploy`
- **Private Key:** Enter directly → вставь содержимое файла **`deploy_key`** (приватный, без `.pub`), целиком от `-----BEGIN` до `-----END`

Затем два раза Add Credentials → **Secret text**:

1. ID `production-host` → публичный IP VPS  
2. ID `production-deploy-path` → `/opt/training-app`

> **Нельзя** ставить `production-deploy-path=/root/training-app`: у `deploy` нет прав на `/root` → `mkdir: cannot create directory '/root': Permission denied`.

## Создание Pipeline job

1. **New Item** → Pipeline (или Multibranch Pipeline).
2. Pipeline → Definition: **Pipeline script from SCM** → Git → URL репозитория.
3. Script Path: `Jenkinsfile`.
4. Для Multibranch: Branch Sources → GitHub/Git, discover branches; деплой только с `DEPLOY_BRANCH`.

## GitHub webhook

1. GitHub → репозиторий → **Settings → Webhooks → Add webhook**.
2. Payload URL: `https://<JENKINS_HOST>/github-webhook/`
3. Content type: `application/json`
4. Events: **Just the push event** (или Pushes).
5. На Jenkins: плагин **GitHub** / **GitHub Branch Source**; job должен быть связан с репозиторием.

После push в `develop` (или `DEPLOY_BRANCH`): checkout → проверки → образы → transfer → deploy → healthcheck → SUCCESS.

Пока credentials нет или путь неверный — build может собрать образы и упасть на **Transfer & Deploy**. Зелёный build без стадии deploy = на production ничего не выкатилось.

## Первичная подготовка production

Каталог приложения должен принадлежать `deploy` (рекомендуется `/opt/training-app`):

```bash
# на сервере
sudo mkdir -p /opt/training-app
sudo chown deploy:deploy /opt/training-app

# если раньше крутили из /root/training-app — перенести и остановить старый стек
cd /root/training-app && sudo docker compose down || true
sudo rsync -a /root/training-app/ /opt/training-app/
sudo chown -R deploy:deploy /opt/training-app

# .env с секретами должен быть в /opt/training-app/.env
sudo -u deploy bash -c 'cd /opt/training-app && test -f .env || cp .env.example .env'
# отредактировать POSTGRES_*, JWT_SECRET, APP_PORT, CERTBOT_* …
```

Первый релиз — через Jenkins (Rebuild после настройки credentials) или вручную после появления образов.

## Почему на сайте «не обновляется»

Проверь по порядку:

1. **В логе Jenkins есть `Deploy SUCCESS`?**  
   Если `Could not find credentials…`, `Permission denied`, или стадия Skip deploy — на сервер ничего не ушло. Сборка образов ≠ деплой.

2. **`production-deploy-path` = `/opt/training-app`**, и именно оттуда крутится стек:
   ```bash
   ssh deploy@HOST 'cd /opt/training-app && grep IMAGE_TAG .env && docker compose ps'
   docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}' | grep workout
   ```
   Образы должны быть вида `workout-frontend:11`, не `:local` и не старый номер.

3. **Старый стек из `/root/training-app` остановлен** (`docker compose down` там). Иначе nginx/порты могут отдавать прежнюю версию.

4. В браузере hard refresh / инкогнито (кэш Next static).

5. В git должен быть нужный коммит на `develop`. Локальные незакоммиченные правки CI не видит.

## Типичные ошибки в логе

| Сообщение | Что сделать |
|-----------|-------------|
| `Could not find credentials entry with ID 'production-ssh'` | Создать credentials (см. выше) |
| `mkdir: cannot create directory '/root': Permission denied` | Сменить `production-deploy-path` на `/opt/training-app`, отдать каталог `deploy` |
| `Branch '…' != DEPLOY_BRANCH` / Skip deploy | Push в `develop` или выставить `DEPLOY_BRANCH` |
| Build SUCCESS, но UI старый | Смотри раздел «не обновляется» — часто крутится старый compose из `/root` |
| В логе `New IMAGE_TAG: 3` при `--image-tag 13` | Баг: `source .env` затирал тег (исправлено: CLI-тег восстанавливается после source) |

## Rollback

`scripts/ci-deploy.sh` пишет `.deploy/state`:

```text
CURRENT_TAG=145
PREVIOUS_TAG=144
```

Если `145` не проходит healthcheck — снова выставляется `IMAGE_TAG=144`, `docker compose up -d --no-build --force-recreate`, проверка health. Предыдущий образ **не** удаляется сразу после успешного деплоя (хранится пара current + previous). Агрессивный `docker system prune -af` **не** используется.

Ручной rollback:

```bash
cd /opt/training-app
# поправить IMAGE_TAG в .env на нужный тег
docker compose up -d --no-build
curl -fsS "http://127.0.0.1:${APP_PORT:-80}/api/health"
curl -fsS "http://127.0.0.1:${APP_PORT:-80}/api/upload-health"
```

## Логи в Jenkins

В консоли явно видны: commit, branch, build number, image tag, validation, deploy/rollback, cleanup.

## Миграции БД

Jenkins **не** запускает `migration:run` отдельно на агенте (на shared-хосте нельзя поднимать тот же compose, что и production).

На production миграции применяются **при старте контейнера backend** — см. `backend/Dockerfile` (`npm run migration:run && node …`). Каждый деплой с `--force-recreate` пересоздаёт backend и прогоняет pending-миграции перед healthcheck.

## Безопасность

- Секреты только в Jenkins Credentials и в production `.env`
- Deploy-пользователь с SSH-ключом, минимальные права, группа `docker`
- Production **не** выполняет `docker build`
- Jenkins после успешного деплоя удаляет локальный image текущего build и `.tar.gz`
