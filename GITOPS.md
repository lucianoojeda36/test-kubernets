# Guía de GitOps con Argo CD

Esta guía explica cómo configurar y usar Argo CD para implementar GitOps en este proyecto.

## ¿Qué es GitOps?

GitOps es una metodología de despliegue donde Git es la única fuente de verdad para la infraestructura y aplicaciones. Los cambios se hacen mediante commits a Git, y herramientas como Argo CD automáticamente sincronizan el cluster con el estado deseado en Git.

## Arquitectura

Este proyecto usa el patrón **App of Apps**:

```
root-app (k8s/argocd/apps/root-app.yaml)
├── mi-app-dev (k8s/argocd/apps/dev-app.yaml) → k8s/dev/
└── mi-app-qa (k8s/argocd/apps/qa-app.yaml) → k8s/qa/
```

- **root-app**: Aplicación principal que gestiona las demás aplicaciones
- **mi-app-dev**: Despliega recursos del ambiente dev desde `k8s/dev/`
- **mi-app-qa**: Despliega recursos del ambiente qa desde `k8s/qa/`

## CI/CD Automático con GitHub Actions

Este proyecto incluye un pipeline de CI/CD completo que automatiza todo el proceso de despliegue.

### Cómo Funciona

```
Developer → git push
    ↓
GitHub Actions detecta cambios en backend/ o frontend/
    ↓
Build Docker images con tag: lucianoojeda36/mi-backend:sha-abc1234
    ↓
Push imágenes a Docker Hub
    ↓
Actualiza manifiestos K8s con nuevo tag
    ↓
Commit automático [skip ci]
    ↓
Argo CD detecta cambio en manifiestos
    ↓
Despliega automáticamente en dev y qa
    ↓
✅ Aplicación actualizada (3-5 min)
```

### Configuración de Docker Hub (Primera Vez)

**Paso 1: Crear cuenta y repositorios en Docker Hub**

1. Ir a https://hub.docker.com y crear cuenta (o login)
2. Crear repositorio público: `lucianoojeda36/mi-backend`
3. Crear repositorio público: `lucianoojeda36/mi-frontend`

**Paso 2: Configurar Secrets en GitHub**

1. Ir a tu repositorio en GitHub
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Agregar:
   - Name: `DOCKER_USERNAME`, Value: `lucianoojeda36`
   - Name: `DOCKER_PASSWORD`, Value: tu password o access token de Docker Hub

**Paso 3: Push del código con workflow**

```bash
# Ya está incluido en el repositorio: .github/workflows/build-and-deploy.yml
git add .
git commit -m "Configurar CI/CD con GitHub Actions"
git push
```

**Paso 4: Verificar que funciona**

```bash
# Ver workflows en GitHub
# https://github.com/lucianoojeda36/test-kubernets/actions

# Deberías ver el workflow "Build and Deploy" corriendo
```

### Workflow de Desarrollo con CI/CD

**Para desplegar cambios:**

```bash
# 1. Hacer cambios en código (ej: frontend/src/App.js)
vim frontend/src/App.js

# 2. Commit y push
git add .
git commit -m "Actualizar título del frontend"
git push

# 3. ¡Eso es todo! GitHub Actions + Argo CD hacen el resto
```

**Monitorear el despliegue:**

```bash
# Ver workflow en GitHub
# https://github.com/lucianoojeda36/test-kubernets/actions

# Ver estado en Argo CD
kubectl get applications -n argocd

# Ver pods actualizándose
kubectl get pods -n dev -w
```

## Instalación Paso a Paso de Argo CD

### 1. Prerequisitos

Asegúrate de tener:
- Minikube corriendo: `minikube status`
- kubectl configurado: `kubectl cluster-info`
- Repositorio de GitHub creado para este proyecto

### 2. Instalar Argo CD

```bash
# Crear namespace para Argo CD
kubectl create namespace argocd

# Instalar Argo CD usando el manifiesto oficial
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Esperar a que todos los pods estén listos (puede tomar 2-3 minutos)
kubectl wait --for=condition=Ready pods --all -n argocd --timeout=300s

# Verificar que todos los pods estén corriendo
kubectl get pods -n argocd
```

Deberías ver algo como:
```
NAME                                  READY   STATUS    RESTARTS   AGE
argocd-application-controller-0       1/1     Running   0          2m
argocd-dex-server-xxx                 1/1     Running   0          2m
argocd-redis-xxx                      1/1     Running   0          2m
argocd-repo-server-xxx                1/1     Running   0          2m
argocd-server-xxx                     1/1     Running   0          2m
```

### 3. Obtener Credenciales de Acceso

```bash
# Obtener el password inicial de admin
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d && echo
```

**Guarda este password**, lo necesitarás para acceder a la UI.

### 4. Acceder a la UI de Argo CD

En una terminal, ejecuta:

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

Deja esta terminal abierta. Ahora abre tu navegador en:
- URL: https://localhost:8080
- Usuario: `admin`
- Password: (el que obtuviste en el paso anterior)

**Nota**: Tu navegador mostrará una advertencia de seguridad (certificado self-signed). Es seguro continuar en este ambiente local.

### 5. Subir tu Código a GitHub

Si aún no lo has hecho:

```bash
# Inicializar git (si no está inicializado)
git init

# Agregar archivos
git add .

# Crear commit inicial
git commit -m "Initial commit con Argo CD configurado"

# Conectar con tu repositorio de GitHub
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git

# Subir código
git branch -M main
git push -u origin main
```

### 6. Configurar las Applications con tu Repositorio

Edita los siguientes archivos y reemplaza `YOUR_GITHUB_USERNAME/YOUR_REPO` con tu repositorio real:

```bash
# Editar los 3 archivos de aplicaciones
# Buscar y reemplazar: YOUR_GITHUB_USERNAME/YOUR_REPO
#
# Archivos a editar:
# - k8s/argocd/apps/root-app.yaml
# - k8s/argocd/apps/dev-app.yaml
# - k8s/argocd/apps/qa-app.yaml
```

Ejemplo de cambio en `root-app.yaml`:
```yaml
spec:
  source:
    repoURL: https://github.com/miusuario/mi-app-k8s  # <-- Cambiar aquí
    targetRevision: HEAD
    path: k8s/argocd/apps
```

**IMPORTANTE**: Haz esto para los 3 archivos antes de continuar.

### 7. Hacer Commit y Push de los Cambios

```bash
git add k8s/argocd/apps/
git commit -m "Configurar URL del repositorio en Argo CD"
git push
```

### 8. Aplicar la Root Application

```bash
# Aplicar la aplicación root (App of Apps)
kubectl apply -f k8s/argocd/apps/root-app.yaml

# Verificar que se creó
kubectl get application -n argocd
```

Deberías ver:
```
NAME       SYNC STATUS   HEALTH STATUS
root-app   Synced        Healthy
```

Después de unos segundos, también aparecerán:
```
NAME          SYNC STATUS   HEALTH STATUS
root-app      Synced        Healthy
mi-app-dev    Synced        Healthy
mi-app-qa     Synced        Healthy
```

### 9. Verificar en la UI

Ve a https://localhost:8080 en tu navegador. Deberías ver tres aplicaciones:
- `root-app`
- `mi-app-dev`
- `mi-app-qa`

Haz clic en cada una para ver los recursos que gestiona.

## Workflow de Desarrollo con GitOps

### Hacer Cambios en la Aplicación

#### Opción A: Cambios en Código (Requiere rebuild de imágenes)

1. **Modificar código** (backend o frontend)

2. **Rebuild imágenes en Minikube**:
   ```bash
   eval $(minikube docker-env)
   cd backend && docker build -t mi-backend:latest .
   cd ../frontend && docker build -t mi-frontend:latest .
   ```

3. **Forzar re-deploy** (cambiar un annotation o label en deployment):
   ```bash
   # Editar k8s/dev/backend-deployment.yaml y agregar/cambiar:
   # metadata.annotations.redeployedAt: "2024-10-24T10:00:00Z"
   ```

4. **Commit y push**:
   ```bash
   git add .
   git commit -m "Actualizar backend con nueva funcionalidad"
   git push
   ```

5. **Argo CD sincroniza automáticamente** (espera hasta 3 minutos o sincroniza manualmente)

#### Opción B: Cambios Solo en Configuración (ConfigMaps, Secrets, etc.)

1. **Modificar configuración**:
   ```bash
   # Por ejemplo, editar k8s/dev/configmap.yaml
   # Cambiar LOG_LEVEL de "debug" a "info"
   ```

2. **Commit y push**:
   ```bash
   git add k8s/dev/configmap.yaml
   git commit -m "Cambiar log level en dev a info"
   git push
   ```

3. **Argo CD sincroniza automáticamente**

### Sincronización Manual

Si necesitas sincronizar inmediatamente sin esperar:

#### Opción 1: Desde la UI
1. Ve a https://localhost:8080
2. Haz clic en la aplicación (e.g., `mi-app-dev`)
3. Clic en "SYNC" → "SYNCHRONIZE"

#### Opción 2: Desde kubectl
```bash
# Forzar sincronización de dev
kubectl patch application mi-app-dev -n argocd --type merge -p '{"operation":{"sync":{}}}'

# Forzar sincronización de qa
kubectl patch application mi-app-qa -n argocd --type merge -p '{"operation":{"sync":{}}}'
```

#### Opción 3: Con Argo CD CLI
```bash
# Instalar CLI (macOS)
brew install argocd

# Login
argocd login localhost:8080

# Sincronizar
argocd app sync mi-app-dev
```

## Monitoreo y Troubleshooting

### Ver Estado de Aplicaciones

```bash
# Ver todas las aplicaciones
kubectl get applications -n argocd

# Ver detalles de una aplicación específica
kubectl describe application mi-app-dev -n argocd

# Ver eventos recientes
kubectl get events -n argocd --sort-by='.lastTimestamp'
```

### Ver Logs de Argo CD

```bash
# Logs del application controller (sincronización)
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller -f

# Logs del server (UI y API)
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-server -f

# Logs del repo server (clonado de Git)
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-repo-server -f
```

### Problemas Comunes

#### 1. Aplicación en estado "OutOfSync"

**Causa**: Git tiene cambios que no están aplicados en el cluster.

**Solución**:
```bash
# Sincronizar manualmente
kubectl patch application mi-app-dev -n argocd --type merge -p '{"operation":{"sync":{}}}'
```

#### 2. Aplicación en estado "Degraded" o "Progressing"

**Causa**: Pods no están listos o hay errores en los manifiestos.

**Solución**:
```bash
# Ver detalles de la app en la UI
# O verificar pods del ambiente:
kubectl get pods -n dev
kubectl describe pod <pod-name> -n dev
kubectl logs <pod-name> -n dev
```

#### 3. "ComparisonError" o "Unknown" health status

**Causa**: Argo CD no puede acceder al repositorio o hay errores en los manifiestos.

**Solución**:
```bash
# Verificar logs del repo server
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-repo-server --tail=100

# Verificar que la URL del repo es correcta
kubectl get application mi-app-dev -n argocd -o yaml | grep repoURL
```

#### 4. Auto-sync no funciona

**Causa**: Puede tomar hasta 3 minutos. O hay errores.

**Solución**:
```bash
# Verificar configuración de auto-sync
kubectl get application mi-app-dev -n argocd -o yaml | grep -A 5 syncPolicy

# Forzar refresh del repo
kubectl patch application mi-app-dev -n argocd --type merge -p '{"operation":{"initiatedBy":{"username":"admin"},"info":[{"name":"Reason","value":"Manual refresh"}]}}'
```

### Ver Diferencias entre Git y Cluster

Desde la UI de Argo CD:
1. Abre la aplicación
2. Clic en "APP DIFF"
3. Verás las diferencias lado a lado

O con CLI:
```bash
argocd app diff mi-app-dev
```

## Rollback de Cambios

### Opción 1: Rollback en Git (Recomendado)

```bash
# Ver historial de commits
git log --oneline

# Revertir al commit anterior
git revert HEAD

# O hacer checkout de una versión anterior
git checkout <commit-hash> k8s/dev/

# Commit y push
git commit -m "Rollback a versión anterior"
git push
```

Argo CD sincronizará automáticamente al estado anterior.

### Opción 2: Rollback con Argo CD

Desde la UI:
1. Ve a la aplicación
2. Clic en "HISTORY AND ROLLBACK"
3. Selecciona la revisión anterior
4. Clic en "ROLLBACK"

## Mejores Prácticas

1. **Siempre haz cambios mediante Git**: Evita `kubectl apply` manual, usa Git y deja que Argo CD sincronice.

2. **Un ambiente = una rama (opcional)**: Puedes usar branches para ambientes:
   - `main` → qa
   - `develop` → dev

   Modifica `targetRevision` en las Applications para apuntar a diferentes ramas.

3. **Usa pull requests**: Revisa cambios antes de mergear a main.

4. **Monitorea la UI**: Mantén la UI abierta para ver sincronizaciones en tiempo real.

5. **ConfigMaps y Secrets**: Evita secretos en Git. Usa sealed-secrets o external-secrets (avanzado).

## Comandos Útiles de Referencia Rápida

```bash
# Obtener password de admin
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d && echo

# Port-forward a UI
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Ver aplicaciones
kubectl get applications -n argocd

# Sincronizar app
kubectl patch application mi-app-dev -n argocd --type merge -p '{"operation":{"sync":{}}}'

# Ver estado de pods en ambientes
kubectl get pods -n dev
kubectl get pods -n qa

# Ver logs de Argo CD
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller -f

# Reiniciar Argo CD server
kubectl rollout restart deployment argocd-server -n argocd

# Eliminar aplicación (pero NO los recursos del cluster)
kubectl delete application mi-app-dev -n argocd

# Eliminar aplicación Y sus recursos del cluster
kubectl patch application mi-app-dev -n argocd -p '{"metadata":{"finalizers":null}}' --type merge
kubectl delete application mi-app-dev -n argocd
```

## Recursos Adicionales

- [Documentación oficial de Argo CD](https://argo-cd.readthedocs.io/)
- [App of Apps Pattern](https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/)
- [GitOps Principles](https://opengitops.dev/)

## Próximos Pasos (Opcional)

Una vez que domines lo básico, considera:

1. **Image Updater**: Automatizar actualización de tags de imágenes en Git
2. **Notifications**: Recibir alertas de sincronización por Slack/email
3. **Multiple Clusters**: Gestionar dev en un cluster y qa/prod en otros
4. **ApplicationSets**: Generar applications dinámicamente
5. **Sealed Secrets**: Encriptar secretos en Git de forma segura
