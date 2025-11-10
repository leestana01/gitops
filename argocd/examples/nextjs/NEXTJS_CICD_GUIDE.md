# Next.js 프로젝트 ArgoCD CI/CD 완벽 가이드

Next.js 애플리케이션을 처음부터 끝까지 ArgoCD로 배포하는 완전한 가이드

## 📋 목차

1. [프로젝트 구조](#1-프로젝트-구조)
2. [Dockerfile 작성](#2-dockerfile-작성)
3. [Kubernetes 매니페스트](#3-kubernetes-매니페스트)
4. [GitHub Actions CI/CD](#4-github-actions-cicd)
5. [ArgoCD Application](#5-argocd-application)
6. [환경 변수 관리](#6-환경-변수-관리)
7. [배포 및 검증](#7-배포-및-검증)
8. [성능 최적화](#8-성능-최적화)

---

## 1. 프로젝트 구조

### 권장 디렉토리 구조

```
nextjs-app/
├── src/
│   ├── app/                      # App Router (Next.js 13+)
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── api/
│   ├── components/
│   └── lib/
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
├── .github/
│   └── workflows/
│       └── ci-cd.yaml
├── Dockerfile
├── .dockerignore
├── next.config.js
├── package.json
└── .env.example
```

---

## 2. Dockerfile 작성

### Standalone Output을 사용한 최적화 Dockerfile

```dockerfile
# ====================================
# Dependencies Stage
# ====================================
FROM node:20-alpine AS deps

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline --no-audit

# ====================================
# Builder Stage
# ====================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for environment variables
ARG NEXT_PUBLIC_API_URL
ARG NODE_ENV=production

# Set environment variables
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NODE_ENV=$NODE_ENV
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js application (standalone output)
RUN npm run build

# ====================================
# Runner Stage
# ====================================
FROM node:20-alpine AS runner

WORKDIR /app

# Metadata
LABEL maintainer="your-email@example.com"
LABEL description="Next.js Application"

# Don't run as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public

# Standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "server.js"]
```

### next.config.js (Standalone 설정)

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for Docker
  output: 'standalone',

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },

  // Image optimization
  images: {
    domains: ['your-cdn.com'],
    formats: ['image/avif', 'image/webp'],
  },

  // Compression
  compress: true,

  // React strict mode
  reactStrictMode: true,

  // Production source maps (optional)
  productionBrowserSourceMaps: false,
}

module.exports = nextConfig
```

### .dockerignore

```
node_modules/
.next/
.git/
.gitignore
.env
.env.*
!.env.example
*.md
.vscode/
.idea/
k8s/
.github/
coverage/
.DS_Store
npm-debug.log
yarn-error.log
```

---

## 3. Kubernetes 매니페스트

### k8s/base/deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nextjs-app
  labels:
    app: nextjs-app
    app.kubernetes.io/name: nextjs-app
    app.kubernetes.io/component: frontend
spec:
  replicas: 3
  revisionHistoryLimit: 3
  selector:
    matchLabels:
      app: nextjs-app
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: nextjs-app
        version: v1
    spec:
      containers:
        - name: app
          image: ghcr.io/your-org/nextjs-app:latest
          imagePullPolicy: Always
          ports:
            - name: http
              containerPort: 3000
              protocol: TCP

          env:
            - name: NODE_ENV
              value: "production"
            - name: PORT
              value: "3000"
            - name: HOSTNAME
              value: "0.0.0.0"
            - name: NEXT_PUBLIC_API_URL
              valueFrom:
                configMapKeyRef:
                  name: nextjs-config
                  key: NEXT_PUBLIC_API_URL
            - name: TZ
              value: "Asia/Seoul"

          envFrom:
            - configMapRef:
                name: nextjs-config
            - secretRef:
                name: nextjs-secrets
                optional: true

          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi

          livenessProbe:
            httpGet:
              path: /api/health
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3

          readinessProbe:
            httpGet:
              path: /api/health
              port: http
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3

          startupProbe:
            httpGet:
              path: /api/health
              port: http
            initialDelaySeconds: 0
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 30

          lifecycle:
            preStop:
              exec:
                command: ["sh", "-c", "sleep 10"]

          securityContext:
            runAsNonRoot: true
            runAsUser: 1001
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - ALL

      securityContext:
        fsGroup: 1001
        runAsNonRoot: true

      terminationGracePeriodSeconds: 30

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
                        - nextjs-app
                topologyKey: kubernetes.io/hostname
```

### k8s/base/service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nextjs-app
  labels:
    app: nextjs-app
spec:
  type: ClusterIP
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800
  ports:
    - port: 80
      targetPort: http
      protocol: TCP
      name: http
  selector:
    app: nextjs-app
```

### k8s/base/configmap.yaml

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nextjs-config
  labels:
    app: nextjs-app
data:
  NEXT_PUBLIC_API_URL: "https://api.example.com"
  NODE_ENV: "production"
```

### k8s/base/ingress.yaml

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nextjs-app
  labels:
    app: nextjs-app
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.klr.kr
      secretName: nextjs-app-tls
  rules:
    - host: app.klr.kr
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: nextjs-app
                port:
                  number: 80
```

### k8s/base/hpa.yaml (선택사항)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nextjs-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nextjs-app
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
```

### k8s/base/kustomization.yaml

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: nextjs-app

commonLabels:
  app.kubernetes.io/name: nextjs-app
  app.kubernetes.io/managed-by: argocd
  app.kubernetes.io/part-of: frontend

resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml
  - ingress.yaml
  # - hpa.yaml

images:
  - name: ghcr.io/your-org/nextjs-app
    newName: ghcr.io/your-org/nextjs-app
    newTag: latest
```

### k8s/overlays/development/kustomization.yaml

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
  - name: nextjs-app
    count: 1

patches:
  - patch: |-
      - op: replace
        path: /spec/rules/0/host
        value: "dev-app.klr.kr"
    target:
      kind: Ingress
      name: nextjs-app

configMapGenerator:
  - name: nextjs-config
    behavior: merge
    literals:
      - NEXT_PUBLIC_API_URL=https://api-dev.example.com
      - NODE_ENV=development
```

### k8s/overlays/production/kustomization.yaml

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
  - name: nextjs-app
    count: 3

patches:
  - path: patch-resources.yaml

configMapGenerator:
  - name: nextjs-config
    behavior: merge
    literals:
      - NEXT_PUBLIC_API_URL=https://api.example.com
      - NODE_ENV=production
```

### k8s/overlays/production/patch-resources.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nextjs-app
spec:
  template:
    spec:
      containers:
        - name: app
          resources:
            requests:
              cpu: 200m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 1Gi
```

---

## 4. GitHub Actions CI/CD

### .github/workflows/ci-cd.yaml

```yaml
name: Next.js CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'src/**'
      - 'public/**'
      - 'package.json'
      - 'next.config.js'
      - 'Dockerfile'
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

      - name: Run type check
        run: npm run type-check
        continue-on-error: true

      - name: Run tests
        run: npm run test
        continue-on-error: true

      - name: Build test
        run: npm run build
        env:
          NEXT_PUBLIC_API_URL: https://api-dev.example.com

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
            NEXT_PUBLIC_API_URL=${{ steps.api-url.outputs.api_url }}
            NODE_ENV=production
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

      - name: Commit and push
        run: |
          cd gitops
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

          git add .
          git commit -m "🚀 Deploy Next.js to ${{ steps.env.outputs.environment }}: ${{ needs.build-and-push.outputs.short-sha }}" || exit 0
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

## 5. ArgoCD Application

### applications/nextjs-app-dev.yaml

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: nextjs-app-dev
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

### applications/nextjs-app-prod.yaml

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: nextjs-app-prod
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

## 6. 환경 변수 관리

### Build-time vs Runtime

**Build-time 변수 (NEXT_PUBLIC_*)**:
- 브라우저에서 접근 가능
- 빌드 시점에 번들에 포함
- Dockerfile ARG로 전달

**Runtime 변수 (일반 환경 변수)**:
- 서버 사이드에서만 접근
- Kubernetes ConfigMap/Secret으로 관리

### Health Check API 엔드포인트

`src/app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  )
}
```

---

## 7. 배포 및 검증

```bash
# ArgoCD Application 생성
kubectl apply -f applications/nextjs-app-dev.yaml

# 배포 확인
kubectl get pods -n dev
kubectl logs -n dev -l app=nextjs-app

# 접속 테스트
curl https://dev-app.klr.kr
```

---

## 8. 성능 최적화

### 1. Image Optimization

```javascript
// next.config.js
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
}
```

### 2. Incremental Static Regeneration (ISR)

```typescript
export const revalidate = 60 // 60초마다 재생성
```

### 3. Caching Strategy

Kubernetes Ingress에 캐싱 설정 추가

---

## 트러블슈팅

### 1. Standalone Output 관련
- `.next/standalone` 디렉토리 확인
- `output: 'standalone'` 설정 확인

### 2. 환경 변수 미적용
- NEXT_PUBLIC_ prefix 확인
- Build-time vs Runtime 구분

### 3. 메모리 부족
- Node.js heap size 조정
- Pod resources 증가

---

## 참고 자료

- [Next.js 공식 문서](https://nextjs.org/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Standalone Output](https://nextjs.org/docs/advanced-features/output-file-tracing)
