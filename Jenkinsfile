pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  environment {
    BACKEND_IMAGE  = 'workout-backend'
    FRONTEND_IMAGE = 'workout-frontend'
    IMAGE_TAG      = "${env.BUILD_NUMBER}"
    ARTIFACT_NAME  = "workout-images-${env.BUILD_NUMBER}.tar.gz"
    ARTIFACT_PATH  = "${env.WORKSPACE}/${env.ARTIFACT_NAME}"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        script {
          env.GIT_COMMIT_SHORT = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
          def branch = env.BRANCH_NAME ?: env.GIT_BRANCH ?: ''
          branch = branch.replaceAll('^origin/', '').trim()
          if (!branch || branch == 'HEAD') {
            branch = sh(
              script: """
                git name-rev --name-only HEAD 2>/dev/null \
                  | sed 's#^remotes/origin/##' | sed 's#^tags/##' | sed 's#~.*##' | sed 's#\\^.*##'
              """.stripIndent().trim(),
              returnStdout: true
            ).trim()
          }
          if (!branch || branch == 'HEAD' || branch == 'undefined') {
            branch = sh(
              script: "git branch -a --contains HEAD | sed 's/^[* ]*//' | grep -v HEAD | head -1 | sed 's#^remotes/origin/##'",
              returnStdout: true
            ).trim()
          }
          env.GIT_BRANCH_NAME = branch ?: 'unknown'
        }
        echo "Commit: ${env.GIT_COMMIT_SHORT}"
        echo "Branch: ${env.GIT_BRANCH_NAME}"
        echo "Build number: ${env.BUILD_NUMBER}"
        echo "Docker image tag: ${env.IMAGE_TAG}"
      }
    }

    stage('Pre-cleanup') {
      steps {
        sh '''
          set +e
          bash scripts/ci-cleanup.sh --agent --aggressive || true
          # Extra reclaim before build on tiny disks
          docker builder prune -af || true
          journalctl --vacuum-size=200M 2>/dev/null || true
          df -h / || true
          true
        '''
      }
    }

    stage('Docker build') {
      steps {
        retry(2) {
          sh '''
            set -euo pipefail
            export DOCKER_BUILDKIT=1

            echo "Disk before build:"
            df -h / /var/lib/docker 2>/dev/null || df -h /

            docker build -t "${BACKEND_IMAGE}:${IMAGE_TAG}" ./backend

            # Give the host a moment after peak memory from previous layer work.
            sleep 2

            docker build \
              --build-arg NEXT_PUBLIC_API_URL=/api \
              -t "${FRONTEND_IMAGE}:${IMAGE_TAG}" ./frontend

            docker image inspect "${BACKEND_IMAGE}:${IMAGE_TAG}" >/dev/null
            docker image inspect "${FRONTEND_IMAGE}:${IMAGE_TAG}" >/dev/null

            echo "Built images:"
            echo "  ${BACKEND_IMAGE}:${IMAGE_TAG}"
            echo "  ${FRONTEND_IMAGE}:${IMAGE_TAG}"
            echo "Disk after build:"
            df -h / 2>/dev/null || true
          '''
        }
      }
    }

    // NOTE: do NOT run `docker compose up/down` here when Jenkins shares the
    // host Docker daemon with production (same container_name / volumes).
    // Smoke + healthcheck happen on production in ci-deploy.sh.

    stage('Export image') {
      steps {
        retry(2) {
          sh '''
            set -euo pipefail
            # Save then gzip (lower peak RAM than save|gzip pipe on small hosts).
            # Need ~2x image size free for .tar before gzip — fail early with a clear message.
            AVAIL_KB="$(df -Pk / | awk 'NR==2{print $4}')"
            NEED_KB=2500000
            if [ "${AVAIL_KB:-0}" -lt "$NEED_KB" ]; then
              echo "Low disk before export (${AVAIL_KB}KB free). Reclaiming…"
              docker builder prune -af || true
              docker image prune -f || true
              AVAIL_KB="$(df -Pk / | awk 'NR==2{print $4}')"
            fi
            if [ "${AVAIL_KB:-0}" -lt "$NEED_KB" ]; then
              echo "ERROR: need ~2.5GB free to export images, have ${AVAIL_KB}KB" >&2
              df -h / >&2
              exit 1
            fi

            TMP_TAR="${WORKSPACE}/workout-images-${IMAGE_TAG}.tar"
            rm -f "${TMP_TAR}" "${ARTIFACT_PATH}"
            docker save \
              "${BACKEND_IMAGE}:${IMAGE_TAG}" \
              "${FRONTEND_IMAGE}:${IMAGE_TAG}" \
              -o "${TMP_TAR}"
            gzip -f "${TMP_TAR}"
            mv "${TMP_TAR}.gz" "${ARTIFACT_PATH}"
            ls -lh "${ARTIFACT_PATH}"
          '''
        }
      }
    }

    stage('Transfer & Deploy') {
      when {
        expression {
          def deployBranch = env.DEPLOY_BRANCH ?: 'develop'
          return env.BRANCH_NAME == deployBranch || env.GIT_BRANCH_NAME == deployBranch
        }
      }
      steps {
        withCredentials([
          sshUserPrivateKey(
            credentialsId: 'production-ssh',
            keyFileVariable: 'SSH_KEY',
            usernameVariable: 'SSH_USER'
          ),
          string(credentialsId: 'production-host', variable: 'SSH_HOST'),
          string(credentialsId: 'production-deploy-path', variable: 'DEPLOY_PATH')
        ]) {
          sh '''
            set -euo pipefail
            SSH_OPTS="-i ${SSH_KEY} -o StrictHostKeyChecking=accept-new -o IdentitiesOnly=yes"

            echo "Transferring ${ARTIFACT_NAME} → ${SSH_USER}@${SSH_HOST}:${DEPLOY_PATH}/.deploy/"
            ssh ${SSH_OPTS} "${SSH_USER}@${SSH_HOST}" "mkdir -p '${DEPLOY_PATH}/.deploy'"
            scp ${SSH_OPTS} "${ARTIFACT_PATH}" "${SSH_USER}@${SSH_HOST}:${DEPLOY_PATH}/.deploy/${ARTIFACT_NAME}"

            echo "Syncing compose/nginx/scripts for commit ${GIT_COMMIT_SHORT} (preserves remote .env)"
            ssh ${SSH_OPTS} "${SSH_USER}@${SSH_HOST}" "mkdir -p '${DEPLOY_PATH}'"
            tar czf - \
              --exclude='.git' \
              --exclude='node_modules' \
              --exclude='.next' \
              --exclude='backend/dist' \
              --exclude='backend/node_modules' \
              --exclude='frontend/node_modules' \
              --exclude='certbot/conf' \
              --exclude='certbot/www' \
              --exclude='.env' \
              --exclude='.deploy' \
              . \
              | ssh ${SSH_OPTS} "${SSH_USER}@${SSH_HOST}" "cd '${DEPLOY_PATH}' && tar xzf -"

            echo "Deploying IMAGE_TAG=${IMAGE_TAG}"
            ssh ${SSH_OPTS} "${SSH_USER}@${SSH_HOST}" \
              "cd '${DEPLOY_PATH}' && \
               bash scripts/ci-deploy.sh \
                 --image-tag '${IMAGE_TAG}' \
                 --artifact '.deploy/${ARTIFACT_NAME}'"
          '''
        }
      }
      post {
        success { echo 'Deployment: SUCCESS' }
        failure { echo 'Deployment: FAILURE (see rollback logs from ci-deploy.sh if any)' }
      }
    }

    stage('Skip deploy (non-deploy branch)') {
      when {
        expression {
          def deployBranch = env.DEPLOY_BRANCH ?: 'develop'
          return !(env.BRANCH_NAME == deployBranch || env.GIT_BRANCH_NAME == deployBranch)
        }
      }
      steps {
        echo "Branch '${env.GIT_BRANCH_NAME}' != DEPLOY_BRANCH '${env.DEPLOY_BRANCH}': build/validate only, no production deploy."
      }
    }
  }

  post {
    always {
      sh '''
        set +e
        echo "===== Build summary ====="
        echo "Commit:        ${GIT_COMMIT_SHORT:-unknown}"
        echo "Branch:        ${GIT_BRANCH_NAME:-unknown}"
        echo "Build number:  ${BUILD_NUMBER}"
        echo "Image tag:     ${IMAGE_TAG}"
        echo "Backend image: ${BACKEND_IMAGE}:${IMAGE_TAG}"
        echo "Frontend image:${FRONTEND_IMAGE}:${IMAGE_TAG}"
        echo "========================="
      '''
    }
    success {
      sh '''
        set +e
        echo "Post-build cleanup on Jenkins agent"
        bash scripts/ci-cleanup.sh --agent --aggressive || true
        rm -f "${ARTIFACT_PATH}"
      '''
    }
    failure {
      sh '''
        set +e
        rm -f "${ARTIFACT_PATH}"
        # Keep failed-build images briefly for debugging; still drop the tar to save disk
        echo "Left images ${BACKEND_IMAGE}:${IMAGE_TAG} / ${FRONTEND_IMAGE}:${IMAGE_TAG} on agent for inspection."
      '''
    }
  }
}
