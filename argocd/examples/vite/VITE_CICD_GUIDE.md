# Vite 프로젝트 ArgoCD CI/CD 완벽 가이드

Vite React/Vue 애플리케이션을 처음부터 끝까지 ArgoCD로 배포하는 완전한 가이드

## 📋 목차

1. [프로젝트 구조](#1-프로젝트-구조)
2. [Dockerfile 작성](#2-dockerfile-작성)
3. [Nginx 설정](#3-nginx-설정)
4. [Kubernetes 매니페스트](#4-kubernetes-매니페스트)
5. [GitHub Actions CI/CD](#5-github-actions-cicd)
6. [ArgoCD Application](#6-argocd-application)
7. [환경 변수 관리](#7-환경-변수-관리)
8. [배포 및 검증](#8-배포-및-검증)

---

## 1. 프로젝트 구조

### 권장 디렉토리 구조

```
vite-app/
├── src/                          # Vite 소스 코드
│   ├── components/
│   ├── pages/
│   ├── assets/
│   └── main.tsx (or main.jsx)
├── public/                       # 정적 파일
├── k8s/                          # Kubernetes 매니페스트
│   ├── base/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── configmap.yaml
│   │   ├── ingress.yaml
│   │   └── kustomization.yaml
│   └── overlays/
│       ├── development/
│       └── production/
├── nginx/
│   └── nginx.conf                # Nginx 설정
├── .github/
│   └── workflows/
│       └── ci-cd.yaml
├── Dockerfile
├── .dockerignore
├── vite.config.ts
├── package.json
└── .env.example
```

---

## 2. Dockerfile 작성

### Multi-stage Dockerfile (최적화)

```dockerfile
# ====================================
# Build Stage
# ====================================
FROM node:20-alpine AS builder

WORKDIR /app

# package.json 복사 및 의존성 설치 (캐싱 활용)
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline --no-audit

# 소스 코드 복사
COPY . .

# 빌드 인수 (환경별 설정)
ARG VITE_API_URL
ARG VITE_APP_ENV=production

# 환경 변수 설정
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_ENV=$VITE_APP_ENV

# Vite 빌드
RUN npm run build

# ====================================
# Runtime Stage
# ====================================
FROM nginx:1.25-alpine

# Metadata
LABEL maintainer="your-email@example.com"
LABEL description="Vite Application"

# Nginx 설정 복사
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# 빌드된 파일 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# 환경 변수 치환을 위한 스크립트
COPY nginx/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Non-root 사용자로 실행 (보안)
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
```

### .dockerignore

```
node_modules/
npm-debug.log
.npm
.git/
.gitignore
.env
.env.*
!.env.example
dist/
*.md
.vscode/
.idea/
k8s/
.github/
*.log
coverage/
.DS_Store
```

---

## 3. Nginx 설정

### nginx/nginx.conf

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip 압축
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript
               application/x-javascript application/xml+rss
               application/javascript application/json;

    include /etc/nginx/conf.d/*.conf;
}
```

### nginx/default.conf

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Static assets with cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # API proxy (선택사항)
    location /api/ {
        proxy_pass ${API_URL}/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA routing (모든 경로를 index.html로)
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # 404 error page
    error_page 404 /index.html;

    # 50x error page
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

### nginx/docker-entrypoint.sh

```bash
#!/bin/sh
set -e

# 환경 변수를 nginx 설정에 치환
envsubst '${API_URL}' < /etc/nginx/conf.d/default.conf > /etc/nginx/conf.d/default.conf.tmp
mv /etc/nginx/conf.d/default.conf.tmp /etc/nginx/conf.d/default.conf

# Nginx 설정 테스트
nginx -t

# Nginx 실행
exec "$@"
```

---

## 4. Kubernetes 매니페스트

### k8s/base/deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vite-app
  labels:
    app: vite-app
    app.kubernetes.io/name: vite-app
    app.kubernetes.io/component: frontend
spec:
  replicas: 2
  revisionHistoryLimit: 3
  selector:
    matchLabels:
      app: vite-app
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: vite-app
        version: v1
    spec:
      containers:
        - name: app
          image: ghcr.io/your-org/vite-app:latest
          imagePullPolicy: Always
          ports:
            - name: http
              containerPort: 80
              protocol: TCP

          env:
            - name: API_URL
              valueFrom:
                configMapKeyRef:
                  name: vite-config
                  key: API_URL
            - name: TZ
              value: "Asia/Seoul"

          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 128Mi

          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3

          readinessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3

          securityContext:
            runAsNonRoot: true
            runAsUser: 101
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - ALL
            readOnlyRootFilesystem: true

      securityContext:
        fsGroup: 101
        runAsNonRoot: true

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
                        - vite-app
                topologyKey: kubernetes.io/hostname
```

### k8s/base/service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: vite-app
  labels:
    app: vite-app
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: http
      protocol: TCP
      name: http
  selector:
    app: vite-app
```

### k8s/base/configmap.yaml

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: vite-config
  labels:
    app: vite-app
data:
  API_URL: "https://api.example.com"
  ENVIRONMENT: "production"
```

### k8s/base/ingress.yaml

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: vite-app
  labels:
    app: vite-app
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.klr.kr
      secretName: vite-app-tls
  rules:
    - host: app.klr.kr
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: vite-app
                port:
                  number: 80
```

### k8s/base/kustomization.yaml

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: vite-app

commonLabels:
  app.kubernetes.io/name: vite-app
  app.kubernetes.io/managed-by: argocd
  app.kubernetes.io/part-of: frontend

resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml
  - ingress.yaml

images:
  - name: ghcr.io/your-org/vite-app
    newName: ghcr.io/your-org/vite-app
    newTag: latest
```

---

## 5. GitHub Actions CI/CD

### .github/workflows/ci-cd.yaml

```yaml
name: Vite CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'src/**'
      - 'public/**'
      - 'package.json'
      - 'vite.config.ts'
      - 'Dockerfile'
      - 'nginx/**'
  pull_request:
    branches: [ main, develop ]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    name: Lint and Test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm run test:unit
        continue-on-error: true

      - name: Build test
        run: npm run build
        env:
          VITE_API_URL: https://api-dev.example.com

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
      short-sha: ${{ steps.vars.outputs.short-sha }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set output variables
        id: vars
        run: |
          echo "short-sha=$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT
          echo "branch=${GITHUB_REF#refs/heads/}" >> $GITHUB_OUTPUT

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitHub Container Registry
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
            type=sha,format=short,prefix=${{ steps.vars.outputs.branch }}-
            type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}

      - name: Determine API URL
        id: api-url
        run: |
          if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "api_url=https://api.example.com" >> $GITHUB_OUTPUT
          else
            echo "api_url=https://api-dev.example.com" >> $GITHUB_OUTPUT
          fi

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          build-args: |
            VITE_API_URL=${{ steps.api-url.outputs.api_url }}
            VITE_APP_ENV=${{ steps.vars.outputs.branch }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          platforms: linux/amd64

  update-manifest:
    name: Update Kubernetes Manifest
    runs-on: ubuntu-latest
    needs: build-and-push
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'

    steps:
      - name: Determine environment
        id: env
        run: |
          if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "environment=production" >> $GITHUB_OUTPUT
          else
            echo "environment=development" >> $GITHUB_OUTPUT
          fi

      - name: Checkout GitOps repository
        uses: actions/checkout@v4
        with:
          repository: leestana01/gitops
          token: ${{ secrets.GITOPS_TOKEN }}
          path: gitops

      - name: Install yq
        run: |
          wget -qO /usr/local/bin/yq https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64
          chmod +x /usr/local/bin/yq

      - name: Update image tag
        run: |
          cd gitops
          IMAGE_TAG="${{ needs.build-and-push.outputs.short-sha }}"
          ENV="${{ steps.env.outputs.environment }}"

          yq eval ".images[0].newTag = \"$IMAGE_TAG\"" -i "k8s/overlays/$ENV/kustomization.yaml"

          echo "Updated $ENV to tag: $IMAGE_TAG"

      - name: Commit and push
        run: |
          cd gitops
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

          git add .
          git commit -m "🚀 Deploy Vite app to ${{ steps.env.outputs.environment }}: ${{ needs.build-and-push.outputs.short-sha }}" || exit 0
          git push

  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: build-and-push

    steps:
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ needs.build-and-push.outputs.short-sha }}
          format: 'table'
          severity: 'CRITICAL,HIGH'
```

---

## 6. ArgoCD Application

### applications/vite-app-dev.yaml

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: vite-app-dev
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
    syncOptions:
      - CreateNamespace=true
```

### applications/vite-app-prod.yaml

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: vite-app-prod
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
      prune: false
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

---

## 7. 환경 변수 관리

### Build-time 환경 변수 (Vite)

`.env.production`:
```bash
VITE_API_URL=https://api.example.com
VITE_APP_NAME=My Vite App
```

### Runtime 환경 변수 (Kubernetes)

ConfigMap으로 관리하여 재빌드 없이 변경 가능

---

## 8. 배포 및 검증

```bash
# ArgoCD Application 생성
kubectl apply -f applications/vite-app-dev.yaml

# 배포 확인
kubectl get pods -n dev
kubectl logs -n dev -l app=vite-app

# 접속 테스트
curl https://dev-app.klr.kr
```

---

## 트러블슈팅

### 1. Vite 빌드 실패
- Node.js 버전 확인
- 의존성 충돌 해결: `npm ci`

### 2. Nginx 403/404 에러
- `nginx.conf` 경로 확인
- SPA routing 설정 확인

### 3. 환경 변수 미적용
- Build-time vs Runtime 변수 구분
- ConfigMap 업데이트 후 Pod 재시작

---

## 참고 자료

- [Vite 공식 문서](https://vitejs.dev/)
- [Nginx 공식 문서](https://nginx.org/en/docs/)
- [Docker Multi-stage Build](https://docs.docker.com/build/building/multi-stage/)
