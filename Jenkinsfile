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

    stage('Docker build') {
      steps {
        sh '''
          set -euo pipefail
          docker build -t "${BACKEND_IMAGE}:${IMAGE_TAG}" ./backend
          docker build \
            --build-arg NEXT_PUBLIC_API_URL=/api \
            -t "${FRONTEND_IMAGE}:${IMAGE_TAG}" ./frontend
          docker image inspect "${BACKEND_IMAGE}:${IMAGE_TAG}" >/dev/null
          docker image inspect "${FRONTEND_IMAGE}:${IMAGE_TAG}" >/dev/null
          echo "Built images:"
          echo "  ${BACKEND_IMAGE}:${IMAGE_TAG}"
          echo "  ${FRONTEND_IMAGE}:${IMAGE_TAG}"
        '''
      }
    }

    // NOTE: do NOT run `docker compose up/down` here when Jenkins shares the
    // host Docker daemon with production (same container_name / volumes).
    // Smoke + healthcheck happen on production in ci-deploy.sh.

    stage('Export image') {
      steps {
        sh '''
          set -euo pipefail
          docker save \
            "${BACKEND_IMAGE}:${IMAGE_TAG}" \
            "${FRONTEND_IMAGE}:${IMAGE_TAG}" \
            | gzip > "${ARTIFACT_PATH}"
          ls -lh "${ARTIFACT_PATH}"
        '''
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
        echo "Cleanup Jenkins local images/artifacts for tag ${IMAGE_TAG}"
        docker rmi "${BACKEND_IMAGE}:${IMAGE_TAG}" "${FRONTEND_IMAGE}:${IMAGE_TAG}" 2>/dev/null
        rm -f "${ARTIFACT_PATH}"
        # Do not run docker system prune -af
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
