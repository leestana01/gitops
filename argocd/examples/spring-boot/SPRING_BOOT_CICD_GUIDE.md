# Spring Boot 프로젝트 ArgoCD CI/CD 완벽 가이드

Spring Boot 애플리케이션을 처음부터 끝까지 ArgoCD로 배포하는 완전한 가이드

## 📋 목차

1. [프로젝트 구조](#1-프로젝트-구조)
2. [Dockerfile 작성](#2-dockerfile-작성)
3. [Kubernetes 매니페스트 작성](#3-kubernetes-매니페스트-작성)
4. [GitHub Actions CI 파이프라인](#4-github-actions-ci-파이프라인)
5. [ArgoCD Application 생성](#5-argocd-application-생성)
6. [배포 및 검증](#6-배포-및-검증)
7. [GitOps 워크플로우](#7-gitops-워크플로우)

---

## 1. 프로젝트 구조

### 권장 디렉토리 구조

```
spring-boot-app/
├── src/                          # Spring Boot 소스 코드
│   ├── main/
│   │   ├── java/
│   │   └── resources/
│   └── test/
├── k8s/                          # Kubernetes 매니페스트
│   ├── base/                     # 공통 리소스
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── configmap.yaml
│   │   └── kustomization.yaml
│   └── overlays/                 # 환경별 설정
│       ├── development/
│       │   ├── kustomization.yaml
│       │   └── patch-replica.yaml
│       ├── staging/
│       │   └── kustomization.yaml
│       └── production/
│           ├── kustomization.yaml
│           ├── patch-replica.yaml
│           └── patch-resources.yaml
├── .github/
│   └── workflows/
│       └── ci-cd.yaml            # GitHub Actions 워크플로우
├── Dockerfile                     # 컨테이너 이미지 빌드
├── .dockerignore
├── pom.xml (or build.gradle)     # 빌드 설정
└── README.md
```

---

## 2. Dockerfile 작성

### Multi-stage Dockerfile (최적화)

```dockerfile
# Build Stage
FROM gradle:8.5-jdk17 AS builder

WORKDIR /app

# Gradle 캐시 활용을 위해 의존성 먼저 다운로드
COPY build.gradle settings.gradle ./
COPY gradle ./gradle
RUN gradle dependencies --no-daemon

# 소스 코드 복사 및 빌드
COPY src ./src
RUN gradle bootJar --no-daemon

# Runtime Stage
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# 보안: non-root 유저 생성
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# JAR 파일 복사
COPY --from=builder /app/build/libs/*.jar app.jar

# 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

# 환경 변수
ENV JAVA_OPTS="-Xmx512m -Xms256m"
ENV SPRING_PROFILES_ACTIVE=default

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

### Maven 버전 (pom.xml 사용 시)

```dockerfile
# Build Stage
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app

# Maven 캐시 활용
COPY pom.xml ./
RUN mvn dependency:go-offline

# 소스 코드 복사 및 빌드
COPY src ./src
RUN mvn clean package -DskipTests

# Runtime Stage
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

COPY --from=builder /app/target/*.jar app.jar

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

ENV JAVA_OPTS="-Xmx512m -Xms256m"
ENV SPRING_PROFILES_ACTIVE=default

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

### .dockerignore

```
# Build artifacts
target/
build/
*.jar
*.war

# IDE
.idea/
.vscode/
*.iml
.gradle/

# Git
.git/
.gitignore

# Documentation
*.md
docs/

# Tests
src/test/

# Kubernetes
k8s/
.github/
```

---

## 3. Kubernetes 매니페스트 작성

### 3.1 Base 리소스

#### k8s/base/deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: spring-boot-app
  labels:
    app: spring-boot-app
    version: v1
spec:
  replicas: 2
  selector:
    matchLabels:
      app: spring-boot-app
  template:
    metadata:
      labels:
        app: spring-boot-app
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/actuator/prometheus"
    spec:
      containers:
        - name: app
          image: your-registry/spring-boot-app:latest  # CI에서 업데이트됨
          imagePullPolicy: Always
          ports:
            - name: http
              containerPort: 8080
              protocol: TCP

          env:
            - name: SPRING_PROFILES_ACTIVE
              value: "production"
            - name: JAVA_OPTS
              value: "-Xmx512m -Xms256m -XX:+UseG1GC"

          envFrom:
            - configMapRef:
                name: spring-boot-config
            - secretRef:
                name: spring-boot-secrets
                optional: true

          resources:
            requests:
              cpu: 250m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 1Gi

          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: http
            initialDelaySeconds: 60
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3

          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: http
            initialDelaySeconds: 30
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3

          lifecycle:
            preStop:
              exec:
                command: ["sh", "-c", "sleep 10"]

      # Graceful shutdown
      terminationGracePeriodSeconds: 30

      # Pod Anti-affinity (고가용성)
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values:
                        - spring-boot-app
                topologyKey: kubernetes.io/hostname
```

#### k8s/base/service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: spring-boot-app
  labels:
    app: spring-boot-app
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: http
      protocol: TCP
      name: http
  selector:
    app: spring-boot-app
```

#### k8s/base/configmap.yaml

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: spring-boot-config
data:
  # Application properties
  SERVER_PORT: "8080"
  LOGGING_LEVEL_ROOT: "INFO"
  MANAGEMENT_ENDPOINTS_WEB_EXPOSURE_INCLUDE: "health,info,prometheus,metrics"
  MANAGEMENT_ENDPOINT_HEALTH_PROBES_ENABLED: "true"
  MANAGEMENT_HEALTH_LIVENESSSTATE_ENABLED: "true"
  MANAGEMENT_HEALTH_READINESSSTATE_ENABLED: "true"
```

#### k8s/base/ingress.yaml

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: spring-boot-app
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.klr.kr
      secretName: spring-boot-app-tls
  rules:
    - host: app.klr.kr
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: spring-boot-app
                port:
                  number: 80
```

#### k8s/base/hpa.yaml (선택사항)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: spring-boot-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: spring-boot-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 100
          periodSeconds: 60
```

#### k8s/base/kustomization.yaml

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: spring-boot-app

commonLabels:
  app.kubernetes.io/name: spring-boot-app
  app.kubernetes.io/managed-by: argocd

resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml
  - ingress.yaml
  # - hpa.yaml  # 필요시 주석 해제

images:
  - name: your-registry/spring-boot-app
    newName: your-registry/spring-boot-app
    newTag: latest  # CI에서 업데이트됨
```

### 3.2 Overlay 환경별 설정

#### k8s/overlays/development/kustomization.yaml

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: dev

bases:
  - ../../base

namePrefix: dev-

commonLabels:
  environment: development

replicas:
  - name: spring-boot-app
    count: 1

patches:
  - patch: |-
      - op: replace
        path: /spec/template/spec/containers/0/env/0/value
        value: "development"
    target:
      kind: Deployment
      name: spring-boot-app

configMapGenerator:
  - name: spring-boot-config
    behavior: merge
    literals:
      - LOGGING_LEVEL_ROOT=DEBUG
      - SPRING_PROFILES_ACTIVE=dev
```

#### k8s/overlays/production/kustomization.yaml

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: production

bases:
  - ../../base

namePrefix: prod-

commonLabels:
  environment: production

replicas:
  - name: spring-boot-app
    count: 3

patches:
  - path: patch-resources.yaml

configMapGenerator:
  - name: spring-boot-config
    behavior: merge
    literals:
      - LOGGING_LEVEL_ROOT=WARN
      - SPRING_PROFILES_ACTIVE=production
```

#### k8s/overlays/production/patch-resources.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: spring-boot-app
spec:
  template:
    spec:
      containers:
        - name: app
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: 2000m
              memory: 2Gi
          env:
            - name: JAVA_OPTS
              value: "-Xmx1536m -Xms1024m -XX:+UseG1GC -XX:MaxGCPauseMillis=200"
```

---

## 4. GitHub Actions CI 파이프라인

### .github/workflows/ci-cd.yaml

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'src/**'
      - 'pom.xml'
      - 'build.gradle'
      - 'Dockerfile'
  pull_request:
    branches: [ main, develop ]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    name: Test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: 'gradle'  # or 'maven'

      - name: Run tests
        run: ./gradlew test
        # Maven: mvn test

      - name: Generate test report
        if: always()
        uses: dorny/test-reporter@v1
        with:
          name: Test Results
          path: build/test-results/test/*.xml
          reporter: java-junit

      - name: Upload coverage to Codecov
        if: success()
        uses: codecov/codecov-action@v3
        with:
          files: ./build/reports/jacoco/test/jacocoTestReport.xml

  build-and-push:
    name: Build and Push Docker Image
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push'

    permissions:
      contents: read
      packages: write

    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
      image-digest: ${{ steps.build.outputs.digest }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix={{branch}}-
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}

      - name: Build and push
        id: build
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          platforms: linux/amd64,linux/arm64

  update-manifest:
    name: Update Kubernetes Manifest
    runs-on: ubuntu-latest
    needs: build-and-push
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'

    steps:
      - name: Checkout GitOps repo
        uses: actions/checkout@v4
        with:
          repository: leestana01/gitops  # GitOps repository
          token: ${{ secrets.GITOPS_TOKEN }}  # Personal Access Token
          path: gitops

      - name: Update image tag
        run: |
          cd gitops

          # 환경 결정
          if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            ENV="production"
          else
            ENV="development"
          fi

          # 이미지 태그 추출
          IMAGE_TAG="${{ needs.build-and-push.outputs.image-tag }}"

          # kustomization.yaml 업데이트
          cd k8s/overlays/$ENV

          # yq 설치 (없으면)
          wget -qO /usr/local/bin/yq https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64
          chmod +x /usr/local/bin/yq

          # 이미지 태그 업데이트
          yq eval ".images[0].newTag = \"${IMAGE_TAG##*:}\"" -i kustomization.yaml

          echo "Updated image tag to: ${IMAGE_TAG##*:}"

      - name: Commit and push
        run: |
          cd gitops

          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

          git add .
          git commit -m "Update image tag to ${{ needs.build-and-push.outputs.image-tag }}" || exit 0
          git push

      - name: Create deployment notification
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.repos.createCommitComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              commit_sha: context.sha,
              body: '✅ Deployed to ${{ github.ref == 'refs/heads/main' && 'Production' || 'Development' }}\n\nImage: ${{ needs.build-and-push.outputs.image-tag }}'
            })

  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: build-and-push

    steps:
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ needs.build-and-push.outputs.image-tag }}
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
```

### Secrets 설정 필요

GitHub Repository Settings → Secrets and variables → Actions:

- `GITOPS_TOKEN`: GitOps repository에 접근할 수 있는 Personal Access Token
  - Scopes: `repo`, `workflow`

---

## 5. ArgoCD Application 생성

### 5.1 개발 환경 Application

`argocd/applications/spring-boot-dev.yaml`:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: spring-boot-app-dev
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: development

  source:
    repoURL: https://github.com/leestana01/gitops
    targetRevision: develop
    path: k8s/overlays/development

  destination:
    server: https://kubernetes.default.svc
    namespace: dev

  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
      - PruneLast=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m

  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
```

### 5.2 프로덕션 환경 Application

`argocd/applications/spring-boot-prod.yaml`:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: spring-boot-app-prod
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: production

  source:
    repoURL: https://github.com/leestana01/gitops
    targetRevision: main
    path: k8s/overlays/production

  destination:
    server: https://kubernetes.default.svc
    namespace: production

  syncPolicy:
    automated:
      prune: false  # 프로덕션은 수동 prune
      selfHeal: true
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
    retry:
      limit: 3
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m

  # Sync Window (프로덕션 배포 시간 제한)
  syncPolicy:
    syncOptions:
      - CreateNamespace=true
```

### 5.3 Application 배포

```bash
# 개발 환경
kubectl apply -f argocd/applications/spring-boot-dev.yaml

# 프로덕션 환경
kubectl apply -f argocd/applications/spring-boot-prod.yaml

# 확인
argocd app list
argocd app get spring-boot-app-dev
```

---

## 6. 배포 및 검증

### 6.1 초기 배포

```bash
# 1. ArgoCD Application 생성
kubectl apply -f argocd/applications/spring-boot-dev.yaml

# 2. Sync 확인
argocd app sync spring-boot-app-dev

# 3. 배포 상태 모니터링
watch kubectl get pods -n dev

# 4. 로그 확인
kubectl logs -n dev -l app=spring-boot-app -f

# 5. 헬스체크
kubectl get pods -n dev -l app=spring-boot-app -o jsonpath='{.items[0].status.containerStatuses[0].state}'
```

### 6.2 배포 검증

```bash
# Pod 상태 확인
kubectl get pods -n dev -l app=spring-boot-app

# Service 확인
kubectl get svc -n dev

# Ingress 확인
kubectl get ingress -n dev

# Application 로그
kubectl logs -n dev deployment/dev-spring-boot-app --tail=100

# Health check
kubectl port-forward -n dev svc/dev-spring-boot-app 8080:80
curl http://localhost:8080/actuator/health
```

### 6.3 ArgoCD UI에서 확인

1. https://argocd.klr.kr 접속
2. `spring-boot-app-dev` 애플리케이션 클릭
3. 리소스 트리 및 상태 확인
4. Sync 히스토리 확인

---

## 7. GitOps 워크플로우

### 7.1 개발 워크플로우

```
Developer → Git Push (develop) → GitHub Actions
                                      ↓
                                  1. Test
                                  2. Build Docker Image
                                  3. Push to Registry
                                  4. Update k8s/overlays/development
                                      ↓
                                  ArgoCD detects change (3분 이내)
                                      ↓
                                  Auto Sync to dev namespace
```

### 7.2 프로덕션 배포 워크플로우

```
Developer → PR to main → Code Review → Merge
                                         ↓
                                     GitHub Actions
                                         ↓
                                  1. Test
                                  2. Build & Push Image
                                  3. Update k8s/overlays/production
                                         ↓
                                     ArgoCD detects
                                         ↓
                                  Auto Sync (또는 Manual Approval)
                                         ↓
                                  Deploy to production
```

### 7.3 롤백 절차

```bash
# 방법 1: ArgoCD에서 이전 버전으로 롤백
argocd app rollback spring-boot-app-prod <revision>

# 방법 2: Git에서 revert
git revert <commit-hash>
git push origin main

# ArgoCD가 자동으로 이전 상태로 복구
```

---

## 8. 모니터링 및 로깅

### 8.1 Spring Boot Actuator 설정

`application.yml`:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus,metrics
  endpoint:
    health:
      probes:
        enabled: true
      show-details: always
  health:
    livenessState:
      enabled: true
    readinessState:
      enabled: true
  metrics:
    export:
      prometheus:
        enabled: true
```

### 8.2 Prometheus & Grafana 연동

```yaml
# ServiceMonitor (Prometheus Operator 사용 시)
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: spring-boot-app
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: spring-boot-app
  endpoints:
    - port: http
      path: /actuator/prometheus
      interval: 30s
```

---

## 9. 트러블슈팅

### 문제: Pod가 CrashLoopBackOff

```bash
# 로그 확인
kubectl logs -n dev <pod-name> --previous

# 일반적인 원인:
# 1. 환경 변수 누락
# 2. ConfigMap/Secret 오류
# 3. 메모리 부족
# 4. Health check 실패
```

### 문제: ArgoCD가 OutOfSync

```bash
# 차이점 확인
argocd app diff spring-boot-app-dev

# 강제 Sync
argocd app sync spring-boot-app-dev --force

# Hard Refresh
argocd app get spring-boot-app-dev --hard-refresh
```

### 문제: 이미지가 업데이트되지 않음

```bash
# Kustomization 확인
cat k8s/overlays/development/kustomization.yaml

# ImagePullPolicy 확인
kubectl get deployment -n dev dev-spring-boot-app -o yaml | grep imagePullPolicy

# 수동으로 재배포
kubectl rollout restart deployment -n dev dev-spring-boot-app
```

---

## 10. 보안 Best Practices

1. **Secrets 관리**: Sealed Secrets 또는 External Secrets Operator 사용
2. **Image Scanning**: Trivy로 취약점 스캔
3. **Network Policy**: Pod 간 통신 제한
4. **RBAC**: 최소 권한 원칙
5. **Non-root 컨테이너**: Dockerfile에서 USER 설정

---

## 11. 참고 자료

- [Spring Boot Actuator](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html)
- [ArgoCD Best Practices](https://argo-cd.readthedocs.io/en/stable/user-guide/best_practices/)
- [Kustomize Documentation](https://kustomize.io/)
- [GitHub Actions](https://docs.github.com/en/actions)
