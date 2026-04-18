# Jenkins on OKE

## Initial setup

### 1. Namespace

```bash
kubectl apply -f namespace.yaml
```

### 2. Image pull secret (`oci-registry-secret`)

`deployment.yaml` uses a custom image from OCIR, so the `jenkins` namespace needs a docker-registry secret named `oci-registry-secret`.

```bash
kubectl create secret docker-registry oci-registry-secret -n jenkins \
  --docker-server=yny.ocir.io \
  --docker-username='axlgn2n9ijoa/<OCI_IAM_USER>' \
  --docker-password='<OCI_AUTH_TOKEN>'
```

This secret is **not** committed — create it once out-of-band. Without a secrets-management layer (SealedSecrets / ExternalSecrets / Vault), keep credentials out of git.

### 3. Storage + core manifests

```bash
kubectl apply -f nfs-pv.yaml -f nfs-pvc.yaml
kubectl apply -f deployment.yaml -f service.yaml -f ingress.yaml
```

## Custom image

`Dockerfile` extends `jenkins/jenkins:lts-jdk21` with:

- `fontconfig` package (fc-cache binary)
- Pre-built font cache at `/var/cache/fontconfig` owned by `jenkins` (uid 1000)

Rationale: the upstream `lts-jdk21` ships `libfontconfig1` + DejaVu fonts but no fontconfig binaries and no pre-built cache. JDK 21's `FontConfigManager.getFontConfig` native call (invoked by `hudson.util.ChartUtil` static init) then hangs indefinitely trying to build a cache in a root-owned directory.

### Rebuild and push

In-cluster via kaniko:

```bash
kubectl -n jenkins create configmap jenkins-dockerfile --from-file=Dockerfile
kubectl apply -f - <<'EOF'
apiVersion: batch/v1
kind: Job
metadata:
  name: build-jenkins-image
  namespace: jenkins
spec:
  backoffLimit: 0
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: kaniko
          image: gcr.io/kaniko-project/executor:latest
          args:
            - "--context=dir:///workspace"
            - "--dockerfile=/workspace/Dockerfile"
            - "--destination=yny.ocir.io/axlgn2n9ijoa/jenkins:<TAG>"
          volumeMounts:
            - { name: dockerfile, mountPath: /workspace }
            - { name: docker-config, mountPath: /kaniko/.docker }
      volumes:
        - { name: dockerfile, configMap: { name: jenkins-dockerfile } }
        - name: docker-config
          secret:
            secretName: ocir-kaniko-secret
            items:
              - { key: config.json, path: config.json }
EOF
```

After push, bump the `image:` tag in `deployment.yaml` and reapply.

## Files

| File | Purpose |
| --- | --- |
| `Dockerfile` | Custom Jenkins image source |
| `namespace.yaml` | Namespace |
| `nfs-pv.yaml`, `nfs-pvc.yaml` | Persistent `JENKINS_HOME` on NFS |
| `deployment.yaml` | Jenkins Deployment |
| `service.yaml` | ClusterIP service |
| `ingress.yaml` | TLS ingress with VPN source-range whitelist |
