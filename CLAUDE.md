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
- **Service mesh**: Services expose via NodePort (backend: 30001 for dev)
- **Resource management**: Deployments include resource limits, liveness, and readiness probes
- **Images**: Built locally and used with `imagePullPolicy: Never` for Minikube

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

- This project uses Minikube's Docker daemon (via `eval $(minikube docker-env)`)
- Images are built locally and never pulled from registries (`imagePullPolicy: Never`)
- Backend service is exposed via NodePort 30001 in dev
- Frontend hardcodes backend URL to `http://localhost:30001/api/mensaje`
- Base Kubernetes resources are in `k8s/base/`, environment-specific ones in `k8s/{env}/`
