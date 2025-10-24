# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Kubernetes-based full-stack application with a Node.js/Express backend and React frontend, designed to run on Minikube with environment-specific configurations for dev and qa.

## Architecture

### Application Structure
- **Backend** (`/backend`): Express.js API server (port 5000) with CORS support
  - Main entry: `server.js`
  - Exposes endpoints: `/api/health`, `/api/mensaje`, `/api/config`
  - Configuration via environment variables (from ConfigMaps and Secrets)

- **Frontend** (`/frontend`): React application with nginx serving
  - Standard Create React App structure
  - Main component: `src/App.js`
  - Communicates with backend via NodePort service (localhost:30001)

### Kubernetes Architecture
- **Multi-environment setup**: Separate namespaces for `dev` and `qa` environments
- **Configuration management**:
  - ConfigMaps (`k8s/{env}/configmap.yaml`): Non-sensitive config (NODE_ENV, LOG_LEVEL, DATABASE_HOST, etc.)
  - Secrets (`k8s/{env}/secret.yaml`): Sensitive data (DATABASE_USER, DATABASE_PASSWORD, JWT_SECRET, API_KEY)
- **Service mesh**: Services expose via NodePort (backend: 30001 for dev, 30002 for qa)
- **Resource management**: Deployments include resource limits, liveness, and readiness probes
- **Images**: Hosted on Docker Hub (`lucianoojeda36/mi-backend`, `lucianoojeda36/mi-frontend`)
- **CI/CD Pipeline**: GitHub Actions automatically builds and deploys on push to main
  - Detects changes in backend/ or frontend/
  - Builds Docker images with SHA-based tags
  - Pushes to Docker Hub
  - Updates K8s manifests with new image tags
  - Argo CD auto-syncs and deploys
- **GitOps with Argo CD**: Continuous deployment managed through Git
  - App of Apps pattern: Root application manages child applications for dev and qa
  - Auto-sync enabled: Changes in manifests automatically deployed to cluster
  - Self-healing: Argo CD automatically corrects drift from Git state

## Development Commands

### Deployment
Deploy to specific environment (requires Minikube running):
```bash
./deploy.sh dev    # Deploy to dev environment
./deploy.sh qa     # Deploy to qa environment
```

The deploy script:
1. Sets up Minikube Docker environment
2. Builds Docker images for backend and frontend
3. Creates namespaces
4. Applies ConfigMaps and Secrets for the specified environment
5. Deploys backend and frontend
6. Verifies deployment status

### Backend Development
```bash
cd backend
npm install              # Install dependencies
node server.js           # Run backend locally (port 5000)
```

### Frontend Development
```bash
cd frontend
npm install              # Install dependencies
npm start                # Start dev server (port 3000)
npm run build            # Build production bundle
npm test                 # Run tests
```

### Docker
Build images manually:
```bash
cd backend && docker build -t mi-backend:latest .
cd frontend && docker build -t mi-frontend:latest .
```

### Kubernetes Operations
```bash
kubectl get pods -n dev                    # View dev pods
kubectl get services -n dev                # View dev services
kubectl logs <pod-name> -n dev             # View pod logs
kubectl describe pod <pod-name> -n dev     # Detailed pod info
kubectl apply -f k8s/dev/configmap.yaml    # Apply ConfigMap
kubectl delete -f k8s/dev/                 # Delete dev resources
```

### Argo CD y GitOps

#### Instalación inicial de Argo CD
```bash
# 1. Crear namespace
kubectl create namespace argocd

# 2. Instalar Argo CD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 3. Esperar a que todos los pods estén listos
kubectl wait --for=condition=Ready pods --all -n argocd --timeout=300s

# 4. Obtener password inicial de admin
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d && echo
```

#### Acceder a la UI de Argo CD
```bash
# Port-forward para acceder a la UI en localhost:8080
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Abrir en navegador: https://localhost:8080
# Usuario: admin
# Password: (obtener con el comando anterior)
```

#### Configurar GitOps (primer uso)
```bash
# 1. Actualizar los manifiestos con tu repositorio GitHub
# Editar k8s/argocd/apps/*.yaml y reemplazar:
#   YOUR_GITHUB_USERNAME/YOUR_REPO con tu repo real

# 2. Aplicar la aplicación root (App of Apps)
kubectl apply -f k8s/argocd/apps/root-app.yaml

# 3. Verificar que las aplicaciones se crearon
kubectl get applications -n argocd
```

#### Operaciones comunes con Argo CD
```bash
# Ver todas las aplicaciones
kubectl get applications -n argocd

# Ver detalles de una aplicación
kubectl describe application mi-app-dev -n argocd

# Sincronizar manualmente una aplicación (si auto-sync está deshabilitado)
kubectl patch application mi-app-dev -n argocd --type merge -p '{"operation":{"sync":{}}}'

# Ver logs de sincronización
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller -f

# Reiniciar Argo CD (si hay problemas)
kubectl rollout restart deployment argocd-server -n argocd
```

#### CLI de Argo CD (opcional)
```bash
# Instalar CLI (macOS)
brew install argocd

# Login
argocd login localhost:8080 --username admin --password <password-del-paso-anterior>

# Ver aplicaciones
argocd app list

# Sincronizar app
argocd app sync mi-app-dev

# Ver detalles y estado
argocd app get mi-app-dev
```

### CI/CD con GitHub Actions

El proyecto usa GitHub Actions para automatizar el build y despliegue.

#### Workflow Automático

Cuando haces `git push` con cambios en `backend/` o `frontend/`:

1. GitHub Actions detecta los cambios
2. Build imágenes Docker con tag basado en SHA del commit (ej: `sha-abc1234`)
3. Push imágenes a Docker Hub
4. Actualiza manifiestos K8s con el nuevo tag de imagen
5. Commit automático de manifiestos con mensaje `[skip ci]`
6. Argo CD detecta cambio en manifiestos y despliega automáticamente

#### Configuración Requerida (Primera Vez)

**En Docker Hub:**
1. Crear cuenta en https://hub.docker.com
2. Crear repositorios públicos: `lucianoojeda36/mi-backend` y `lucianoojeda36/mi-frontend`

**En GitHub (Settings → Secrets and variables → Actions):**
1. Agregar `DOCKER_USERNAME` = tu usuario de Docker Hub
2. Agregar `DOCKER_PASSWORD` = tu password o access token de Docker Hub

#### Ver Estado del CI/CD

```bash
# Ver workflows en GitHub
# https://github.com/lucianoojeda36/test-kubernets/actions

# Ver imágenes en Docker Hub
# https://hub.docker.com/r/lucianoojeda36/mi-backend
# https://hub.docker.com/r/lucianoojeda36/mi-frontend

# Ver tags de imagen actual en manifiestos
grep "image:" k8s/dev/backend-deployment.yaml
grep "image:" k8s/dev/frontend-deployment.yaml
```

#### Workflow Completo de Despliegue

```
1. Hacer cambios en código (ej: frontend/src/App.js)
   ↓
2. git add . && git commit -m "..." && git push
   ↓
3. GitHub Actions: Build + Push a Docker Hub (~2-3 min)
   ↓
4. GitHub Actions: Update manifests + Commit [skip ci]
   ↓
5. Argo CD: Detecta cambio y sincroniza (~1-2 min)
   ↓
6. ✅ Aplicación desplegada automáticamente en Minikube
```

**Tiempo total:** ~3-5 minutos desde push hasta despliegue completo

## Key Configuration Patterns

### Environment Variables in Backend
Backend (`server.js:8-21`) reads configuration from environment variables with fallback defaults. All config comes from Kubernetes ConfigMaps and Secrets, injected via deployment manifests.

### Backend Configuration Injection
Backend deployment manifests (`k8s/{env}/backend-deployment.yaml`) inject config as environment variables using `valueFrom` with `configMapKeyRef` and `secretKeyRef`.

### Multi-Environment Strategy
Each environment (dev/qa) has its own:
- Namespace
- ConfigMap with environment-specific values
- Secret with environment-specific sensitive data
- Deployment manifests referencing the environment's namespace

### Health Checks
Backend implements `/api/health` endpoint used by Kubernetes liveness and readiness probes (configured in deployment manifests).

## Important Notes

- **CI/CD Automático**: Push a main dispara build y despliegue automático vía GitHub Actions
- **Imágenes**: Hosted en Docker Hub con tags versionados (`lucianoojeda36/mi-backend:sha-xxxxx`)
- **Configuración requerida**: Secrets de Docker Hub en GitHub Actions (ver sección CI/CD)
- **Backend service**: NodePort 30001 (dev), 30002 (qa)
- **Frontend service**: NodePort 30003 (dev), 30004 (qa)
- **Argo CD Applications**: En `k8s/argocd/apps/` con App of Apps pattern
- **GitOps**: Cambios en manifiestos se despliegan automáticamente (auto-sync enabled)
- **Deployment manual**: `./deploy.sh` ya NO se usa, todo es automatizado con CI/CD
- For detailed GitOps workflow and troubleshooting, see GITOPS.md
