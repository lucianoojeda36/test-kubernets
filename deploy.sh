#!/bin/bash

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ENVIRONMENT=$1

if [ -z "$ENVIRONMENT" ]; then
    echo "Uso: ./deploy.sh [dev|qa]"
    exit 1
fi

if [ "$ENVIRONMENT" != "dev" ] && [ "$ENVIRONMENT" != "qa" ]; then
    echo "Ambiente inválido. Usa 'dev' o 'qa'"
    exit 1
fi

echo -e "${BLUE}Desplegando en ambiente: $ENVIRONMENT${NC}"

# Usar Docker daemon de Minikube
eval $(minikube docker-env)

# Construir imágenes
echo -e "${GREEN}Construyendo imágenes...${NC}"
cd backend && docker build -t mi-backend:latest .
cd ../frontend && docker build -t mi-frontend:latest .
cd ..

# Crear namespaces
echo -e "${GREEN}Creando namespaces...${NC}"
kubectl apply -f k8s/base/namespaces.yaml

# Aplicar ConfigMaps y Secrets
echo -e "${GREEN}Aplicando ConfigMaps y Secrets para $ENVIRONMENT...${NC}"
kubectl apply -f k8s/$ENVIRONMENT/configmap.yaml
kubectl apply -f k8s/$ENVIRONMENT/secret.yaml

# Desplegar aplicaciones
echo -e "${GREEN}Desplegando aplicaciones en $ENVIRONMENT...${NC}"
kubectl apply -f k8s/$ENVIRONMENT/backend-deployment.yaml
kubectl apply -f k8s/$ENVIRONMENT/frontend-deployment.yaml

# Verificar deployment
echo -e "${GREEN}Verificando deployment...${NC}"
kubectl get pods -n $ENVIRONMENT
kubectl get services -n $ENVIRONMENT

echo -e "${BLUE}Deployment completado!${NC}"