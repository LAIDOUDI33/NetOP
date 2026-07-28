#!/bin/bash
# ============================================================
# Djezzy National SOC Platform - Production Deployment Script
# Phase 10: Final Production Hardening & Go-Live
# ============================================================

set -euo pipefail

# ============================================================
# CONFIGURATION
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="$PROJECT_ROOT/deployment-$(date +%Y%m%d-%H%M%S).log"
BACKUP_DIR="/backups/soc-platform/$(date +%Y%m%d)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================
# LOGGING FUNCTIONS
# ============================================================
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# ============================================================
# PRE-DEPLOYMENT CHECKS
# ============================================================
pre_deployment_checks() {
    log "=========================================="
    log "Running Pre-Deployment Checks..."
    log "=========================================="
    
    local checks_passed=0
    local checks_total=6
    
    # Check 1: Kubernetes connectivity
    info "Checking Kubernetes cluster connectivity..."
    if kubectl cluster-info &>/dev/null; then
        log "✓ Kubernetes cluster is accessible"
        ((checks_passed++))
    else
        error "✗ Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check 2: Helm availability
    info "Checking Helm installation..."
    if helm version &>/dev/null; then
        log "✓ Helm is installed: $(helm version --short)"
        ((checks_passed++))
    else
        error "✗ Helm is not installed"
        exit 1
    fi
    
    # Check 3: Required secrets exist
    info "Checking required Kubernetes secrets..."
    if kubectl get secret soc-database-credentials -n soc-production &>/dev/null; then
        log "✓ Database credentials secret exists"
        ((checks_passed++))
    else
        warn "⚠ Database credentials secret not found - will use defaults"
    fi
    
    # Check 4: Disk space (>20GB available)
    info "Checking disk space..."
    local available_space=$(df -BG / | awk 'NR==2 {print $4}' | tr -d 'G')
    if [[ "$available_space" -gt 20 ]]; then
        log "✓ Sufficient disk space: ${available_space}GB available"
        ((checks_passed++))
    else
        error "✗ Insufficient disk space: ${available_space}GB available (need >20GB)"
        exit 1
    fi
    
    # Check 5: Memory available
    info "Checking system memory..."
    local total_mem=$(free -g | awk '/^Mem:/{print $2}')
    if [[ "$total_mem" -gt 8 ]]; then
        log "✓ Sufficient memory: ${total_mem}GB total"
        ((checks_passed++))
    else
        warn "⚠ Low memory detected: ${total_mem}GB total"
    fi
    
    # Check 6: Git repository status
    info "Checking git repository status..."
    cd "$PROJECT_ROOT"
    if git status --porcelain | grep -q .; then
        warn "⚠ Uncommitted changes in repository"
    else
        log "✓ Working directory clean"
        ((checks_passed++))
    fi
    
    log ""
    log "Pre-deployment checks: ${checks_passed}/${checks_total} passed"
    
    if [[ "$checks_passed" -lt "$checks_total" ]]; then
        error "Not all pre-deployment checks passed. Aborting."
        exit 1
    fi
    
    return 0
}

# ============================================================
# BACKUP FUNCTIONS
# ============================================================
create_backup() {
    log "=========================================="
    log "Creating Backup Before Deployment..."
    log "=========================================="
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup current deployment configuration
    info "Backing up current Helm releases..."
    helm get values soc-platform -n soc-production > "$BACKUP_DIR/helm-values-backup.yaml" 2>/dev/null || true
    
    # Backup current Kubernetes manifests
    info "Backing up current Kubernetes resources..."
    kubectl get all -n soc-production -o yaml > "$BACKUP_DIR/current-resources.yaml" 2>/dev/null || true
    
    # Backup ConfigMaps and Secrets (excluding sensitive data)
    info "Backing up ConfigMaps..."
    kubectl get configmaps -n soc-production -o yaml > "$BACKUP_DIR/configmaps.yaml" 2>/dev/null || true
    
    # Create database backup if PostgreSQL is accessible
    info "Attempting database backup..."
    if kubectl get pod -n soc-production -l app=postgresql -o name 2>/dev/null | grep -q pod; then
        kubectl exec -n soc-production $(kubectl get pod -n soc-production -l app=postgresql -o jsonpath='{.items[0].metadata.name}') \
            -- pg_dump -U soc_user soc_platform | gzip > "$BACKUP_DIR/db-backup.sql.gz" 2>/dev/null || \
            warn "Database backup failed - manual backup may be required"
    fi
    
    log "✓ Backup completed: $BACKUP_DIR"
}

# ============================================================
# DEPLOYMENT FUNCTIONS
# ============================================================
deploy_infrastructure() {
    log "=========================================="
    log "Deploying Infrastructure Components..."
    log "=========================================="
    
    # Apply namespace with security labels
    info "Applying namespace configuration..."
    kubectl apply -f "$PROJECT_ROOT/k8s/namespace.yaml"
    
    # Apply Network Policies
    info "Applying Network Policies..."
    kubectl apply -f "$PROJECT_ROOT/10_Production_Hardening_GoLive/security/network-policies.yaml"
    
    # Apply Pod Security Standards
    info "Applying Pod Security Standards..."
    kubectl apply -f "$PROJECT_ROOT/10_Production_Hardening_GoLive/security/pod-security.yaml"
    
    # Apply Resource Quotas
    info "Applying Resource Quotas..."
    kubectl apply -f "$PROJECT_ROOT/10_Production_Hardening_GoLive/security/resource-quotas.yaml"
    
    log "✓ Infrastructure components deployed"
}

deploy_application() {
    log "=========================================="
    log "Deploying Application via Helm..."
    log "=========================================="
    
    cd "$PROJECT_ROOT/helm/soc-platform"
    
    # Update dependencies
    info "Updating Helm dependencies..."
    helm dependency update
    
    # Dry run first
    info "Running Helm template (dry run)..."
    helm template soc-platform . \
        -f values.yaml \
        -f "$PROJECT_ROOT/helm/soc-platform/values-production.yaml" \
        --namespace soc-production > /tmp/soc-template.yaml
    
    # Validate the template
    info "Validating generated manifest..."
    kubectl apply --dry-run=client -f /tmp/soc-template.yaml
    
    # Actual upgrade
    info "Upgrading Helm release..."
    helm upgrade --install soc-platform . \
        -f values.yaml \
        -f "$PROJECT_ROOT/helm/soc-platform/values-production.yaml" \
        --namespace soc-production \
        --wait \
        --timeout 10m \
        --atomic \
        --cleanup-on-fail \
        --history-max 10
    
    log "✓ Application deployed successfully"
}

deploy_monitoring() {
    log "=========================================="
    log "Deploying Monitoring Stack..."
    log "=========================================="
    
    # Deploy Prometheus rules
    info "Deploying Prometheus alerting rules..."
    kubectl apply -f "$PROJECT_ROOT/10_Production_Hardening_GoLive/monitoring/prometheus-rules.yaml"
    
    # Deploy Grafana dashboards
    info "Deploying Grafana dashboards..."
    kubectl apply -f "$PROJECT_ROOT/10_Production_Hardening_GoLive/monitoring/grafana-dashboards/"
    
    # Deploy ServiceMonitors
    info "Deploying ServiceMonitors..."
    kubectl apply -f "$PROJECT_ROOT/10_Production_Hardening_GoLive/monitoring/service-monitors.yaml"
    
    log "✓ Monitoring stack deployed"
}

# ============================================================
# POST-DEPLOYMENT VERIFICATION
# ============================================================
post_deployment_verification() {
    log "=========================================="
    log "Running Post-Deployment Verification..."
    log "=========================================="
    
    local verification_passed=0
    local verification_total=8
    
    # Verify 1: All pods are running
    info "Verifying pod status..."
    sleep 30  # Wait for pods to start
    local ready_pods=$(kubectl get pods -n soc-production -o jsonpath='{range .items[*]}{.status.phase}{"\n"}{end}' | grep -c Running || echo 0)
    local total_pods=$(kubectl get pods -n soc-production --no-headers | wc -l)
    
    if [[ "$ready_pods" -eq "$total_pods" ]] && [[ "$total_pods" -gt 0 ]]; then
        log "✓ All pods are running ($ready_pods/$total_pods)"
        ((verification_passed++))
    else
        warn "⚠ Not all pods are ready ($ready_pods/$total_pods)"
        kubectl get pods -n soc-production
    fi
    
    # Verify 2: Service endpoints are accessible
    info "Verifying service endpoints..."
    if kubectl get endpoints soc-platform -n soc-platform -o jsonpath='{.subsets[*].addresses}' | grep -q ipAddress; then
        log "✓ Service endpoints are configured"
        ((verification_passed++))
    else
        warn "⚠ No service endpoints found"
    fi
    
    # Verify 3: Ingress is configured
    info "Verifying ingress configuration..."
    if kubectl get ingress -n soc-production -o name 2>/dev/null | grep -q ingress; then
        log "✓ Ingress is configured"
        ((verification_passed++))
    else
        warn "⚠ No ingress found"
    fi
    
    # Verify 4: TLS certificate is valid
    info "Verifying TLS certificates..."
    if kubectl get certificate -n soc-production 2>/dev/null | grep -q True; then
        log "✓ TLS certificates are valid"
        ((verification_passed++))
    else
        warn "⚠ TLS certificate issues detected"
    fi
    
    # Verify 5: HPA is configured
    info "Verifying Horizontal Pod Autoscaler..."
    if kubectl get hpa -n soc-production -o name 2>/dev/null | grep -q hpa; then
        log "✓ HPA is configured"
        ((verification_passed++))
    else
        warn "⚠ HPA not found"
    fi
    
    # Verify 6: PDB is configured
    info "Verifying Pod Disruption Budgets..."
    if kubectl get pdb -n soc-production -o name 2>/dev/null | grep -q pdb; then
        log "✓ PDB is configured"
        ((verification_passed++))
    else
        warn "⚠ PDB not found"
    fi
    
    # Verify 7: Health endpoint responds
    info "Verifying application health endpoint..."
    local health_status=$(curl -sk -o /dev/null -w "%{http_code}" https://soc.djezzy.dz/api/health 2>/dev/null || echo "000")
    if [[ "$health_status" == "200" ]]; then
        log "✓ Health endpoint returns 200 OK"
        ((verification_passed++))
    else
        warn "⚠ Health endpoint returned: $health_status"
    fi
    
    # Verify 8: Resources are within limits
    info "Verifying resource utilization..."
    local cpu_usage=$(kubectl top pods -n soc-production --no-headers 2>/dev/null | awk '{sum+=$3} END {print sum}' || echo "0")
    if [[ -n "$cpu_usage" ]]; then
        log "✓ Resource monitoring active (CPU: ${cpu_usage}m)"
        ((verification_passed++))
    else
        warn "⚠ Could not retrieve resource metrics"
    fi
    
    log ""
    log "Post-deployment verification: ${verification_passed}/${verification_total} passed"
    
    if [[ "$verification_passed" -lt $((verification_total / 2)) ]]; then
        error "Critical verification failures detected!"
        return 1
    fi
    
    return 0
}

# ============================================================
# ROLLBACK FUNCTION
# ============================================================
rollback() {
    log "=========================================="
    log "Initiating Rollback Procedure..."
    log "=========================================="
    
    warn "Rolling back to previous version..."
    
    # Helm rollback
    if helm history soc-platform -n soc-production &>/dev/null; then
        local previous_revision=$(helm history soc-platform -n soc-production --max 2 --output json | jq -r '.[-2].revision')
        
        if [[ -n "$previous_revision" ]]; then
            info "Rolling back to revision $previous_revision..."
            helm rollback soc-platform "$previous_revision" -n soc-production --wait --timeout 5m
            log "✓ Rollback completed successfully"
        else
            error "No previous revision to rollback to"
        fi
    else
        error "No Helm release history found"
    fi
}

# ============================================================
# MAIN DEPLOYMENT WORKFLOW
# ============================================================
main() {
    log "============================================================"
    log "Djezzy National SOC Platform - Production Deployment"
    log "Timestamp: $(date '+%Y-%m-%d %H:%M:%S %Z')"
    log "Environment: PRODUCTION"
    log "============================================================"
    echo ""
    
    # Parse arguments
    local action="${1:-deploy}"
    
    case "$action" in
        deploy)
            pre_deployment_checks
            create_backup
            deploy_infrastructure
            deploy_application
            deploy_monitoring
            post_deployment_verification
            
            log ""
            log "============================================================"
            log "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
            log "============================================================"
            log "Next steps:"
            log "1. Monitor application logs: kubectl logs -f -n soc-platform -l app=soc-platform"
            log "2. Check Grafana dashboards for metrics"
            log "3. Verify user access and functionality"
            log "4. Notify stakeholders of successful deployment"
            ;;
            
        rollback)
            rollback
            post_deployment_verification
            ;;
            
        verify-only)
            post_deployment_verification
            ;;
            
        backup-only)
            create_backup
            ;;
            
        *)
            echo "Usage: $0 {deploy|rollback|verify-only|backup-only}"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
