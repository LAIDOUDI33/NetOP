#!/bin/bash
# ============================================================
# National SOC Platform - Deployment Scripts
# Djezzy Production Deployment Automation
# ============================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VERSION="${VERSION:-latest}"
REGISTRY="${REGISTRY:-soc.djezzy.dz}"
NAMESPACE="soc-platform"
CONTEXT="${KUBECONTEXT:-djezzy-production}"

# ============================================================
# Helper Functions
# ============================================================

print_header() {
    echo -e "\n${BLUE}============================================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}============================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check Docker
    if command -v docker &> /dev/null; then
        print_success "Docker installed: $(docker --version)"
    else
        print_error "Docker not installed. Please install Docker first."
        exit 1
    fi
    
    # Check kubectl
    if command -v kubectl &> /dev/null; then
        print_success "kubectl installed: $(kubectl version --client --short 2>/dev/null || kubectl version --client)"
    else
        print_error "kubectl not installed. Please install kubectl first."
        exit 1
    fi
    
    # Check Helm (optional)
    if command -v helm &> /dev/null; then
        print_success "Helm installed: $(helm version --short)"
    else
        print_warning "Helm not installed. Using kubectl manifests instead."
    fi
    
    # Check kubectl context
    CURRENT_CONTEXT=$(kubectl config current-context 2>/dev/null || echo "none")
    print_success "Kubernetes context: ${CURRENT_CONTEXT}"
}

# ============================================================
# Build Commands
# ============================================================

build_image() {
    print_header "Building Docker Image"
    
    print_success "Building image: ${REGISTRY}/soc-platform:${VERSION}"
    
    docker build \
        --target runner \
        --tag ${REGISTRY}/soc-platform:${VERSION} \
        --tag ${REGISTRY}/soc-platform:latest \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        --progress=plain \
        .
    
    print_success "Image built successfully"
}

push_image() {
    print_header "Pushing Docker Image to Registry"
    
    docker push ${REGISTRY}/soc-platform:${VERSION}
    docker push ${REGISTRY}/soc-platform:latest
    
    print_success "Image pushed successfully"
}

# ============================================================
# Kubernetes Deployment (kubectl)
# ============================================================

deploy_k8s() {
    print_header "Deploying to Kubernetes (kubectl)"
    
    # Create namespace
    print_success "Creating namespace: ${NAMESPACE}"
    kubectl apply -f k8s/namespace.yaml --context=${CONTEXT}
    
    # Create ConfigMap
    print_success "Applying ConfigMap"
    kubectl apply -f k8s/configmap.yaml --namespace=${NAMESPACE} --context=${CONTEXT}
    
    # Create secrets (if they don't exist)
    if ! kubectl get secret soc-platform-secrets -n ${NAMESPACE} --context=${CONTEXT} &>/dev/null; then
        print_warning "Secret 'soc-platform-secrets' not found. Creating from template..."
        print_error "Please update k8s/secret.yaml with your actual secrets before deploying!"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kubectl apply -f k8s/secret.yaml --namespace=${NAMESPACE} --context=${CONTEXT}
        else
            exit 1
        fi
    fi
    
    # Create PVCs
    print_success "Applying Persistent Volume Claims"
    kubectl apply -f k8s/pvc.yaml --namespace=${NAMESPACE} --context=${CONTEXT}
    
    # Deploy application
    print_success "Applying Deployment"
    kubectl apply -f k8s/deployment.yaml --namespace=${NAMESPACE} --context=${CONTEXT}
    
    # Create service
    print_success "Applying Service"
    kubectl apply -f k8s/service.yaml --namespace=${NAMESPACE} --context=${CONTEXT}
    
    # Create HPA and PDB
    print_success "Applying Autoscaling"
    kubectl apply -f k8s/hpa.yaml --namespace=${NAMESPACE} --context=${CONTEXT}
    
    print_success "Applying Pod Disruption Budget"
    kubectl apply -f k8s/pdb.yaml --namespace=${NAMESPACE} --context=${CONTEXT}
    
    # Create Ingress (last, after services are up)
    print_success "Applying Ingress"
    kubectl apply -f k8s/ingress.yaml --namespace=${NAMESPACE} --context=${CONTEXT}
    
    print_success "Deployment complete!"
}

# ============================================================
# Helm Deployment
# ============================================================

deploy_helm() {
    print_header "Deploying with Helm"
    
    # Update dependencies
    print_success "Updating Helm dependencies"
    cd helm/soc-platform && helm dependency update && cd ../..
    
    # Install or upgrade
    helm upgrade --install soc-platform ./helm/soc-platform \
        --namespace ${NAMESPACE} \
        --create-namespace \
        --set app.image.tag=${VERSION} \
        --set global.imageRegistry=${REGISTRY} \
        --values helm/soc-platform/values.yaml \
        --wait \
        --timeout=10m \
        --kube-context=${CONTEXT}
    
    print_success "Helm deployment complete!"
}

# ============================================================
# Rollback
# ============================================================

rollback() {
    print_header "Rolling Back Deployment"
    
    REVISION="${1:-1}"
    
    if command -v helm &> /dev/null; then
        print_success "Rolling back to revision ${REVISION} using Helm"
        helm rollback soc-platform ${REVISION} --namespace=${NAMESPACE} --kube-context=${CONTEXT}
    else
        print_success "Rolling back using kubectl"
        kubectl rollout undo deployment/soc-platform -n ${NAMESPACE} --to-revision=${REVISION} --context=${CONTEXT}
    fi
}

# ============================================================
# Status & Debugging
# ============================================================

status() {
    print_header "Deployment Status"
    
    echo -e "\n${YELLOW}Pods:${NC}"
    kubectl get pods -n ${NAMESPACE} --context=${CONTEXT} -l app.kubernetes.io/name=soc-platform -o wide
    
    echo -e "\n${YELLOW}Services:${NC}"
    kubectl get svc -n ${NAMESPACE} --context=${CONTEXT} -l app.kubernetes.io/name=soc-platform
    
    echo -e "\n${YELLOW}Ingress:${NC}"
    kubectl get ingress -n ${NAMESPACE} --context=${CONTEXT} -l app.kubernetes.io/name=soc-platform
    
    echo -e "\n${YELLOW}HPA Status:${NC}"
    kubectl get hpa -n ${NAMESPACE} --context=${CONTEXT} -l app.kubernetes.io/name=soc-platform
    
    echo -e "\n${YELLOW}Recent Events:${NC}"
    kubectl get events -n ${NAMESPACE} --context=${CONTEXT} --sort-by='.lastTimestamp' | tail -20
}

logs() {
    print_header "Application Logs"
    
    POD=$(kubectl get pods -n ${NAMESPACE} --context=${CONTEXT} -l app.kubernetes.io/name=soc-platform -o jsonpath='{.items[0].metadata.name}')
    
    if [ -z "$POD" ]; then
        print_error "No pods found"
        return 1
    fi
    
    print_success "Following logs from pod: ${POD}"
    kubectl logs -f ${POD} -n ${NAMESPACE} --context=${CONTEXT} --tail=100
}

# ============================================================
# Cleanup
# ============================================================

cleanup() {
    print_header "Cleaning Up Deployment"
    
    read -p "Are you sure you want to delete all resources? (yes/no) " confirm
    if [ "$confirm" = "yes" ]; then
        kubectl delete -f k8s/ --namespace=${NAMESPACE} --context=${CONTEXT}
        
        if command -v helm &> /dev/null; then
            uninstall soc-platform --namespace=${NAMESPACE} --kube-context=${CONTEXT}
        fi
        
        print_success "Cleanup complete"
    else
        print_warning "Cleanup cancelled"
    fi
}

# ============================================================
# Main Menu
# ============================================================

usage() {
    echo -e "\n${BLUE}National SOC Platform - Djezzy Deployment Tool${NC}\n"
    echo "Usage: $0 <command> [options]\n"
    echo "Commands:"
    echo "  build              Build Docker image"
    echo "  push               Push image to registry"
    echo "  deploy             Deploy to Kubernetes (kubectl)"
    echo "  deploy-helm        Deploy using Helm chart"
    echo "  status             Show deployment status"
    echo "  logs               Tail application logs"
    echo "  rollback [rev]     Rollback to previous revision"
    echo "  cleanup            Delete all resources"
    echo "  check              Check prerequisites"
    echo ""
    echo "Environment Variables:"
    echo "  VERSION            Image version tag (default: latest)"
    echo "  REGISTRY           Container registry (default: soc.djezzy.dz)"
    echo "  KUBECONTEXT        Kubeconfig context (default: djezzy-production)"
    echo ""
    echo "Examples:"
    echo "  $0 build                    # Build image with default settings"
    echo "  $0 VERSION=1.0.0 build     # Build specific version"
    echo "  $0 deploy                  # Deploy using kubectl manifests"
    echo "  $0 deploy-helm             # Deploy using Helm"
    echo "  $0 rollback 2              # Rollback to revision 2"
    echo ""
}

# Main entry point
case "${1:-}" in
    build)
        check_prerequisites
        build_image
        ;;
    push)
        check_prerequisites
        push_image
        ;;
    deploy)
        check_prerequisites
        deploy_k8s
        ;;
    deploy-helm)
        check_prerequisites
        deploy_helm
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
    rollback)
        rollback "${2:-1}"
        ;;
    cleanup)
        cleanup
        ;;
    check)
        check_prerequisites
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        usage
        exit 1
        ;;
esac
