# Spring Boot ArgoCD CI/CD Example

이 디렉토리는 Spring Boot 애플리케이션을 ArgoCD로 배포하는 완전한 예제를 포함합니다.

## 📁 디렉토리 구조

```
spring-boot/
├── Dockerfile                    # Multi-stage 최적화 Dockerfile
├── .dockerignore                 # Docker 빌드 제외 파일
├── k8s/                          # Kubernetes 매니페스트
│   ├── base/                     # 공통 리소스
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── configmap.yaml
│   │   ├── ingress.yaml
│   │   └── kustomization.yaml
│   └── overlays/                 # 환경별 설정
│       ├── development/
│       │   └── kustomization.yaml
│       └── production/
│           ├── kustomization.yaml
│           └── patch-resources.yaml
└── github/
    └── workflows/
        └── ci-cd.yaml            # GitHub Actions 워크플로우
```

## 🚀 빠른 시작

### 1. 이 템플릿을 Spring Boot 프로젝트에 복사

```bash
# Spring Boot 프로젝트 루트에서
cp -r /path/to/argocd/examples/spring-boot/k8s ./
cp /path/to/argocd/examples/spring-boot/Dockerfile ./
cp /path/to/argocd/examples/spring-boot/.dockerignore ./
mkdir -p .github/workflows
cp /path/to/argocd/examples/spring-boot/github/workflows/ci-cd.yaml .github/workflows/
```

### 2. 설정 파일 수정

#### k8s/base/kustomization.yaml
```yaml
images:
  - name: ghcr.io/your-org/spring-boot-app
    newName: ghcr.io/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME  # 변경
    newTag: latest
```

#### k8s/base/ingress.yaml
```yaml
spec:
  rules:
    - host: your-app.klr.kr  # 실제 도메인으로 변경
```

#### .github/workflows/ci-cd.yaml
```yaml
- name: Checkout GitOps repository
  uses: actions/checkout@v4
  with:
    repository: YOUR_USERNAME/gitops  # GitOps 저장소로 변경
    token: ${{ secrets.GITOPS_TOKEN }}
```

### 3. GitHub Secrets 설정

Repository Settings → Secrets and variables → Actions:

- `GITOPS_TOKEN`: GitOps repository 접근 토큰
  - Scopes: `repo`, `workflow`

### 4. Spring Boot Actuator 설정

`application.yml`에 추가:

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
```

### 5. ArgoCD Application 생성

```bash
# 개발 환경
kubectl apply -f /path/to/argocd/applications/spring-boot-dev.yaml

# 프로덕션 환경
kubectl apply -f /path/to/argocd/applications/spring-boot-prod.yaml
```

## 📝 워크플로우

### 개발 워크플로우 (develop 브랜치)

```
1. 코드 변경 및 commit
2. git push origin develop
3. GitHub Actions 실행:
   - 테스트 실행
   - Docker 이미지 빌드 및 푸시
   - k8s/overlays/development 업데이트
4. ArgoCD가 자동으로 감지 (3분 이내)
5. dev namespace에 자동 배포
```

### 프로덕션 배포 워크플로우 (main 브랜치)

```
1. develop → main PR 생성
2. 코드 리뷰 및 승인
3. Merge to main
4. GitHub Actions 실행:
   - 테스트 실행
   - Docker 이미지 빌드 및 푸시
   - k8s/overlays/production 업데이트
5. ArgoCD가 자동으로 감지
6. production namespace에 배포
```

## 🔧 커스터마이징

### 리소스 제한 변경

`k8s/overlays/production/patch-resources.yaml`:

```yaml
resources:
  requests:
    cpu: 500m      # 필요에 따라 조정
    memory: 1Gi
  limits:
    cpu: 2000m
    memory: 2Gi
```

### 환경 변수 추가

`k8s/base/configmap.yaml`:

```yaml
data:
  YOUR_ENV_VAR: "value"
```

### Replica 수 조정

`k8s/overlays/development/kustomization.yaml`:

```yaml
replicas:
  - name: spring-boot-app
    count: 1  # 개발 환경 replica 수
```

## 🔍 모니터링

### 로그 확인

```bash
# 개발 환경
kubectl logs -n dev -l app=spring-boot-app -f

# 프로덕션 환경
kubectl logs -n production -l app=spring-boot-app -f
```

### 상태 확인

```bash
# Pod 상태
kubectl get pods -n dev

# ArgoCD 상태
argocd app get spring-boot-app-dev
```

### Health Check

```bash
# Port forward
kubectl port-forward -n dev svc/dev-spring-boot-app 8080:80

# Health check
curl http://localhost:8080/actuator/health
```

## 🐛 트러블슈팅

### 이미지 pull 실패

```bash
# ImagePullSecrets 확인
kubectl get secrets -n dev

# GitHub Container Registry 인증 확인
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_USERNAME \
  --docker-password=YOUR_TOKEN \
  -n dev
```

### ArgoCD OutOfSync

```bash
# 차이점 확인
argocd app diff spring-boot-app-dev

# 강제 동기화
argocd app sync spring-boot-app-dev --force
```

## 📚 추가 문서

- [완전한 가이드](../../SPRING_BOOT_CICD_GUIDE.md)
- [ArgoCD 공식 문서](https://argo-cd.readthedocs.io/)
- [Kustomize 문서](https://kustomize.io/)
