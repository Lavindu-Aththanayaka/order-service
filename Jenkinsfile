pipeline {
    agent any

    environment {
        SERVICE_NAME  = "order-service"
        DOCKER_IMAGE  = "lavinduaththanayaka/${SERVICE_NAME}"
        IMAGE_TAG     = "${BUILD_NUMBER}"
        DOCKER_NET    = "ecommerce-net"
    }

    stages {

        stage('Checkout') {
            steps {
                // Pulls the latest code from this service's own repository.
                git branch: 'main', url: 'https://github.com/Lavindu-Aththanayaka/order-service.git'
            }
        }

        stage('Install & Build') {
            steps {
                echo "Installing dependencies for ${SERVICE_NAME}..."
                sh 'npm install'

            }
        }

        stage('Test') {
            steps {
                echo "Running tests for ${SERVICE_NAME}..."
                sh 'npm test'
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    dockerImage = docker.build("${DOCKER_IMAGE}:${IMAGE_TAG}")
                }
            }
        }

        stage('Push to Registry') {
            steps {
                script {
                    docker.withRegistry('https://index.docker.io/v1/', 'dockerhub-credentials') {
                        dockerImage.push("${IMAGE_TAG}")
                        dockerImage.push("latest")
                    }
                }
            }
        }

        stage('Record Previous Version') {
            steps {
                script {
                    // Captures the image ID currently running under this
                    // container name (if any), so a failed deploy can be
                    // rolled back to exactly what was running before -
                    // this is the Docker-only equivalent of Kubernetes'
                    // built-in rollout history.
                    env.PREVIOUS_IMAGE = sh(
                        script: "docker inspect --format='{{.Image}}' ${SERVICE_NAME} 2>/dev/null || true",
                        returnStdout: true
                    ).trim()
                    echo "Previous running image (if any): ${env.PREVIOUS_IMAGE}"
                }
            }
        }

        stage('Deploy') {
            steps {
                echo "Deploying ${SERVICE_NAME} via Docker..."
                sh """
                    docker network create ${DOCKER_NET} 2>/dev/null || true
                    docker rm -f ${SERVICE_NAME} 2>/dev/null || true
                    docker run -d --name ${SERVICE_NAME} \\
                        --network ${DOCKER_NET} \\
                        -p 8082:8082 \\
                        -e PORT=8082 \\
                        -e DB_HOST=order-db \\
                        -e DB_PORT=5432 \\
                        -e DB_NAME=orderdb \\
                        -e DB_USER=order_user \\
                        -e DB_PASSWORD=changeme \\
                        -e INVENTORY_SERVICE_URL=http://inventory-service:8081 \\
                        --restart unless-stopped \\
                        ${DOCKER_IMAGE}:${IMAGE_TAG}
                """
            }
        }

        stage('Validate Deployment') {
            steps {
                echo "Checking container health for ${SERVICE_NAME}..."
                sh """
                    sleep 8
                    docker ps --filter "name=${SERVICE_NAME}" --format "{{.Names}}\t{{.Status}}"
                    docker inspect --format='Health: {{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' ${SERVICE_NAME}
                """
            }
        }
    }

    post {
        failure {
            script {
                if (env.PREVIOUS_IMAGE?.trim()) {
                    echo "Deployment failed — rolling back ${SERVICE_NAME} to previous image ${env.PREVIOUS_IMAGE}..."
                    sh """
                        docker rm -f ${SERVICE_NAME} 2>/dev/null || true
                        docker run -d --name ${SERVICE_NAME} \\
                            --network ${DOCKER_NET} \\
                            -p 8082:8082 \\
                        -e PORT=8082 \\
                        -e DB_HOST=order-db \\
                        -e DB_PORT=5432 \\
                        -e DB_NAME=orderdb \\
                        -e DB_USER=order_user \\
                        -e DB_PASSWORD=changeme \\
                        -e INVENTORY_SERVICE_URL=http://inventory-service:8081 \\
                            --restart unless-stopped \\
                            ${env.PREVIOUS_IMAGE}
                    """
                } else {
                    echo "Deployment failed and no previous image was recorded — nothing to roll back to. ${SERVICE_NAME} may be down."
                }
            }
        }
        success {
            echo "${SERVICE_NAME} deployed successfully."
        }
    }
}
