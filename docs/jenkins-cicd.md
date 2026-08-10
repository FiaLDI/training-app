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

Имена образов: `workout-backend:${BUILD_NUMBER}`, `workout-frontend:${BUILD_NUMBER}`.  
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

Создать в **Manage Jenkins → Credentials** (не писать в Jenkinsfile):

| ID | Тип | Назначение |
|----|-----|------------|
| `production-ssh` | SSH Username with private key | пользователь + ключ на production |
| `production-host` | Secret text | хост / IP, например `203.0.113.10` |
| `production-deploy-path` | Secret text | путь на сервере, например `/opt/training-app` |
| (опционально) GitHub creds | Username/password или GitHub App | если private repo |

Опционально в Job / Folder env:

- `DEPLOY_BRANCH` — ветка для деплоя (по умолчанию `main`)

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

После push в `main` (или `DEPLOY_BRANCH`): checkout → проверки → образы → transfer → deploy → healthcheck → SUCCESS.

## Первичная подготовка production

```bash
# на сервере
sudo adduser --disabled-password deploy
sudo usermod -aG docker deploy
# положить public key в /home/deploy/.ssh/authorized_keys

sudo mkdir -p /opt/training-app
sudo chown deploy:deploy /opt/training-app
sudo -u deploy git clone git@github.com:FiaLDI/training-app.git /opt/training-app
cd /opt/training-app
cp .env.example .env
# отредактировать POSTGRES_*, JWT_SECRET, APP_PORT, CERTBOT_* …
```

Первый релиз можно прогнать через Jenkins или вручную после появления образов.

## Rollback

`scripts/ci-deploy.sh` пишет `.deploy/state`:

```text
CURRENT_TAG=145
PREVIOUS_TAG=144
```

Если `145` не проходит healthcheck — снова выставляется `IMAGE_TAG=144`, `docker compose up -d --no-build`, проверка health. Предыдущий образ **не** удаляется сразу после успешного деплоя (хранится пара current + previous). Агрессивный `docker system prune -af` **не** используется.

Ручной rollback:

```bash
cd /opt/training-app
# поправить IMAGE_TAG в .env на нужный тег
docker compose up -d --no-build
curl -fsS "http://127.0.0.1:${APP_PORT:-80}/api/health"
```

## Логи в Jenkins

В консоли явно видны: commit, branch, build number, image tag, validation, deploy/rollback, cleanup.

## Безопасность

- Секреты только в Jenkins Credentials и в production `.env`
- Deploy-пользователь с SSH-ключом, минимальные права, группа `docker`
- Production **не** выполняет `docker build`
- Jenkins после успешного деплоя удаляет локальный image текущего build и `.tar.gz`
