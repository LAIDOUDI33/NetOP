# 🚀 Open-Source SOC Stack - Quick Start Deployment Guide

## Deploy Your World-Class National SOC in 30 Days

This guide provides step-by-step instructions to deploy the complete open-source security operations center using industry-leading tools.

---

## 📋 Prerequisites

### Hardware Requirements (Minimum for Pilot)

| Component | CPU | RAM | Storage | Network |
|-----------|-----|-----|---------|---------|
| **Wazuh Server** | 8 cores | 16 GB | 500 GB SSD | 1 Gbps |
| **OpenSearch Node** | 16 cores | 32 GB | 1 TB SSD | 10 Gbps |
| **TheHive/Cortex** | 4 cores | 8 GB | 100 GB SSD | 1 Gbps |
| **MISP** | 4 cores | 8 GB | 200 GB SSD | 1 Gbps |
| **Grafana** | 2 cores | 4 GB | 50 GB SSD | 1 Gbps |

### Software Requirements

```bash
# Operating System
- Ubuntu 22.04 LTS (recommended) or RHEL 8/9
- Docker & Docker Compose (latest)
- Git, curl, wget

# For Wazuh Agents
- Windows 10/Server 2016+
- Linux (RHEL, Ubuntu, CentOS, Debian)
- macOS 10.15+
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    YOUR OPEN-SOURCE SOC                          │
│                                                                  │
│   ┌───────────┐    ┌───────────┐    ┌───────────┐              │
│   │  WAZUH    │───▶│ OPENSEARCH│───▶│  GRAFANA  │              │
│   │  SERVER   │    │  CLUSTER  │    │ DASHBOARDS│              │
│   │           │    │           │    │           │              │
│   │ • SIEM    │    │ • STORAGE │    │ • Real-time│              │
│   │ • XDR     │    │ • SEARCH  │    │ • Metrics │              │
│   │ • EDR     │    │           │    │ • Alerts  │              │
│   └─────┬─────┘    └───────────┘    └───────────┘              │
│         │                                                    │
│         ▼                                                    │
│   ┌───────────┐    ┌───────────┐    ┌───────────┐              │
│   │ THEHIVE   │◄──│  CORTEX   │    │    MISP    │              │
│   │ CASE MGMT│    │ ANALYSIS  │    │ THREAT    │              │
│   │           │    │ ENGINE    │    │ INTEL     │              │
│   │ • Tickets │    │ • IOCs    │    │           │              │
│   │ • Tasks   │    │ • Enrich  │    │ • IOCs    │              │
│   │ • Cases   │    │ • Automate│    │ • Feeds    │              │
│   └───────────┘    └───────────┘    └───────────┘              │
│                                                                  │
│   ┌───────────┐    ┌───────────┐                               │
│   │ SURICATA  │    │   ZEEK    │                               │
│   │ IDS/IPS   │    │ NSM       │                               │
│   └───────────┘    └───────────┘                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Deployment Option 1: Docker Compose (Recommended)

### Step 1: Prepare Environment

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Create project directory
mkdir -p /opt/soc-openstack && cd /opt/soc-openstack

# Clone configuration repository (or use our configs)
git init
```

### Step 2: Create Docker Compose File

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  # ==========================================
  # WAZUH SERVER (SIEM/XDR)
  # ==========================================
  wazuh-server:
    image: wazuh/wazuh-server:4.8.0
    hostname: wazuh-server
    restart: always
    ports:
      - "1514:1514"   # Syslog
      - "1515:1515"   # Agent communication
      - "55000:55000" # API
      - "443:443"     # Dashboard
    environment:
      - INDEXER_URL=https://opensearch-node1:9200
      - INDEXER_USERNAME=admin
      - INDEXER_PASSWORD=StrongPassword123!
      - FILEBEAT_SSL_VERIFICATION_MODE=none
    volumes:
      - wazuh_etc:/var/ossec/etc
      - wazuh_logs:/var/ossec/logs
      - wazuh_queue:/var/ossec/queue
      - wazuh_integrations:/var/ossec/integrations
      - wazuh_active_response:/var/ossec/active-response
      - wazuh_wodle:/var/ossec/wodle
      - wazuh_api_configuration:/var/ossec/api/configuration
      - wazuh_cluster:/var/ossec/cluster
      - wazuh_custom_rules:/var/ossec/etc/rules
      - wazuh_decoders:/var/ossec/etc/decoders
    depends_on:
      - opensearch-single-node

  # ==========================================
  # OPENSEARCH (Log Storage & Analytics)
  # ==========================================
  opensearch-single-node:
    image: opensearchproject/opensearch:latest
    container_name: opensearch-node1
    environment:
      - cluster.name=opensearch-cluster
      - node.name=opensearch-node1
      - discovery.type=single-node
      - bootstrap.memory_lock=true
      - "OPENSEARCH_JAVA_OPTS=-Xms4g -Xmx4g"
      - DISABLE_SECURITY_PLUGIN=false  # Enable for production!
      - OPENSEARCH_INITIAL_ADMIN_PASSWORD=Admin123!
    ulimits:
      memlock:
        soft: -1
        hard: -1
      nofile:
        soft: 65536
        hard: 65536
    volumes:
      - opensearch-data:/usr/share/opensearch/data
    ports:
      - "9200:9200"
      - "9600:9600"

  # OpenSearch Dashboards
  opensearch-dashboards:
    image: opensearchproject/opensearch-dashboards:latest
    container_name: opensearch-dashboards
    ports:
      - "5601:5601"
    environment:
      - 'OPENSEARCH_HOSTS=["https://opensearch-node1:9200"]'
      - 'DISABLE_SECURITY_DASHBOARDS_PLUGIN=false'
    depends_on:
      - opensearch-single-node

  # ==========================================
  # THEHIVE + CORTEX (Case Management & SOAR)
  # ==========================================
  thehive:
    stringlabs/thehive:latest
    container_name: thehive
    ports:
      - "9000:9000"
    environment:
      - JVM_OPTS=-Xmx2g
    volumes:
      - thehive_conf:/etc/thehive
      - thehive_data:/thehive_data
    depends_on:
      - cortex

  cortex:
    thehiveproject/cortex:latest
    container_name: cortex
    ports:
      - "9001:9001"
    command: --job-directory /cortex/jobs
    environment:
      - CORTEX_JOB_TIMEOUT=300
      - CORTEX_MAX_TLP=amber
    volumes:
      - cortex_conf:/etc/cortex
      - cortex_jobs:/cortex/jobs

  # ==========================================
  # MISP (Threat Intelligence Platform)
  # ==========================================
  misp-server:
    misp/misp:latest
    container_name: misp-server
    ports:
      - "80:80"
      - "443:443"
    environment:
      - MYSQL_HOST=misp-db
      - MYSQL_PASSWORD=MispDBPass123!
      - MISP_BASEURL=https://misp.your-domain.dz
      - POSTGRES_HOST=misp-postgres
      - POSTGRES_PASSWORD=MispPGPass123!
      - REDIS_HOST=misp-redis
    volumes:
      - misp_config:/var/www/MISP/app/Config
      - misp_files:/var/www/MISP/app/files
      - misp_certs:/var/www/MISP/.gnupg
      - misp_pgp:/var/www/MISP/.pgp
    depends_on:
      - misp-db
      - misp-postgres
      - misp-redis

  misp-db:
    mariadb:10.6
    container_name: misp-db
    environment:
      - MYSQL_ROOT_PASSWORD=RootPass123!
      - MYSQL_USER=misp
      - MYSQL_PASSWORD=MispDBPass123!
    volumes:
      - misp_db_data:/var/lib/mysql

  misp-postgres:
    postgres:14-alpine
    container_name: misp-postgres
    environment:
      - POSTGRES_USER=misp
      - POSTGRES_PASSWORD=MispPGPass123!
      - POSTGRES_DB=misp
    volumes:
      - misp_pg_data:/var/lib/postgresql/data

  misp-redis:
    redis:7-alpine
    container_name: misp-redis
    volumes:
      - misp_redis_data:/data

  # ==========================================
  # GRAFANA (Visualization)
  # ==========================================
  grafana:
    grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=GrafanaAdmin123!
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
      - grafana_provisioning:/etc/grafana/provisioning

  # ==========================================
  # SURICATA (Network IDS/IPS)
  # ==========================================
  suricata:
    jasonish/suricata:latest
    container_name: suricata
    network_mode: host
    cap_add:
      - NET_ADMIN
      - SYS_NICE
    volumes:
      - suricata-config:/etc/suricata
      - suricata-logs:/var/log/suricata
    command: ["-i", "eth0", "-c", "/etc/suricata/suricata.yaml"]

volumes:
  wazuh_etc:
  wazuh_logs:
  wazuh_queue:
  wazuh_integrations:
  wazuh_active_response:
  wazuh_wodle:
  wazuh_api_configuration:
  wazuh_cluster:
  wazuh_custom_rules:
  wazuh_decoders:
  opensearch-data:
  thehive_conf:
  thehive_data:
  cortex_conf:
  cortex_jobs:
  misp_config:
  misp_files:
  misp_certs:
  misp_pgp:
  misp_db_data:
  misp_pg_data:
  misp_redis_data:
  grafana_data:
  grafana_provisioning:
  suricata-config:
  suricata-logs:

networks:
  soc-network:
    driver: bridge
```

### Step 3: Deploy the Stack

```bash
# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### Step 4: Initial Configuration

#### Configure Wazuh Dashboard
```bash
# Access Wazuh Dashboard
open https://your-server-ip

# Default credentials (CHANGE IMMEDIATELY):
# Username: admin
# Password: SecretPassword (set during install)
```

#### Configure TheHive
```bash
# Access TheHive
open http://your-server-ip:9000

# Default credentials:
# Username: admin@thehive.local
# Password: secret (change on first login)

# Connect to Cortex:
# Settings → Cortex → http://cortex:9001
```

#### Configure MISP
```bash
# Access MISP
open https://your-server-ip

# Complete initial setup wizard
# Set admin email and password
# Configure server settings
```

#### Configure Grafana
```bash
# Access Grafana
open http://your-server-ip:3000

# Login:
# Username: admin
# Password: GrafanaAdmin123!

# Add OpenSearch as data source:
# Data Sources → Add → OpenSearch
# URL: http://opensearch-node1:9200
```

---

## 🔧 Deployment Option 2: Individual Installation (Production)

For production deployments, install each component separately for better control.

### Install Wazuh Server

```bash
# Add Wazuh repository
curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | sudo gpg --no-default-keyring --keyring gnupg-ring:/usr/share/keyrings/wazuh.gpg --import && chmod 644 /usr/share/keyrings/wazuh.gpg

echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" | sudo tee /etc/apt/sources.list.d/wazuh.list

# Install Wazuh manager
sudo apt update
sudo apt install wazuh-manager wazuh-dashboard -y

# Start services
sudo systemctl daemon-reload
sudo systemctl enable wazuh-manager
sudo systemctl start wazuh-manager
```

### Install OpenSearch Cluster

```bash
# Import OpenSearch GPG key
wget -qO - https://artifacts.opensearch.org/publickeys/openseash.pgp | sudo gpg --dearmor -o /usr/share/keyrings/opensearch-keyring.gpg

# Add repository
echo "deb [signed-by=/usr/share/keyrings/opensearch-keyring.gpg] https://artifacts.opensearch.org/debian stable main" | sudo tee /etc/apt/sources.list.d/opensearch.list

# Install OpenSearch
sudo apt update
sudo apt install opensearch opensearch-dashboards -y

# Configure memory
sudo sed -i 's/-Xms1g/-Xms8g/' /etc/opensearch/opensearch.yml
sudo sed -i 's/-Xmx1g/-Xmx8g/' /etc/opensearch/opensearch.yml

# Start services
sudo systemctl enable opensearch
sudo systemctl start opensearch
```

### Install TheHive

```bash
# Download latest release
wget https://github.com/TheHive-Project/TheHive/releases/download/v5.4.4/hive-linux-x64.zip

# Unzip and configure
unzip hive-linux-x64.zip -d /opt/thehive
cd /opt/thehive

# Edit application.conf
nano conf/application.conf

# Start TheHive
./bin/thehive
```

### Install MISP

```bash
# Clone MISP
cd /var/www
sudo git clone https://github.com/MISP/MISP.git misp
cd misp
sudo git checkout tags/v2.4

# Run installer
sudo ./installer.sh -c

# Follow interactive setup
```

---

## 🔌 Agent Deployment

### Deploy Wazuh Agents at Scale

#### Method 1: Ansible Playbook

Create `deploy_agents.yml`:

```yaml
---
- name: Deploy Wazuh Agents
  hosts: all
  become: yes
  
  tasks:
    - name: Add Wazuh repository
      apt_repository:
        repo: "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main"
        state: present
        
    - name: Install Wazuh agent
      apt:
        name: wazuh-agent
        state: present
        update_cache: yes
        
    - name: Configure agent
      template:
        src: templates/ossec.conf.j2
        dest: /var/ossec/etc/ossec.conf
        owner: root
        group: root
        mode: '0640'
        
    - name: Start Wazuh agent
      service:
        name: wazuh-agent
        state: started
        enabled: yes
```

Run:
```bash
ansible-playbook -i inventory deploy_agents.yml
```

#### Method 2: Group Policy (Windows)

1. Download Wazuh agent MSI from dashboard
2. Create GPO with MSI installer
3. Configure with manager IP address
4. Deploy to OUs

#### Method 3: Script Deployment (Linux)

```bash
#!/bin/bash
# deploy_wazuh_agent.sh - Deploy to single Linux machine

WAZUH_MANAGER_IP="your-wazuh-server-ip"

# Add repository
curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | gpg --no-default-keyring --keyring gnupg-ring:/usr/share/keyrings/wazuh.gpg --import && echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" | tee /etc/apt/sources.list.d/wazuh.list

# Update and install
apt-get update
apt-get install wazuh-agent -y

# Configure
sed -i "s/<MANAGER_IP>/${WAZUH_MANAGER_IP}/" /var/ossec/etc/ossec.conf

# Start service
systemctl daemon-reload
systemctl enable wazuh-agent
systemctl start wazuh-agent

echo "✅ Wazuh agent deployed successfully!"
```

---

## ✅ Verification Checklist

### Post-Deployment Checks

```markdown
## System Health Checklist

### Wazuh Server
- [ ] Manager API accessible (https://<IP>:55000)
- [ ] Dashboard loading (https://<IP>)
- [ ] Agents connecting (check agent list)
- [ ] Alerts generating in dashboard
- [ ] Rules active (>500 rules loaded)

### OpenSearch
- [ ] Cluster health green (`curl -k https://localhost:9200/_cluster/health`)
- [ ] Indices creating (wazuh-alerts-*)
- [ ] Search working in Grafana
- [ ] Storage not exceeding 80%

### TheHive
- [ ] UI accessible (http://<IP>:9000)
- [ ] Cases can be created
- [ ] Cortex integration working
- [ ] Alert forwarding from Wazuh configured

### MISP
- [ ] UI accessible (https://<IP>)
- [ ] Feeds syncing (test with Abuse.ch)
- [ ] IOC creation working
- [ ] Sharing groups configured

### Grafana
- [ ] UI accessible (http://<IP>:3000)
- [ ] OpenSearch data source connected
- [ ] Dashboards importing
- * ] Alerts displaying correctly

### Suricata
- [ ] Service running (`suricata -T`)
- [ ] Logs generating (/var/log/suricata/)
- [ ] Alerts flowing to Wazuh/EVE
- [ ] Rule set updated (Emerging Threats)

### Integration Tests
- [ ] Wazuh → TheHive alert forwarding
- [ ] TheHive ↔ MISP IOC sync
- [ ] Cortex analyzers responding
- [ ] Grafana dashboards populating
```

---

## 🚨 First Detection Test

### Simulate an Attack to Verify Everything Works

```bash
# On a monitored endpoint, run these commands:

# 1. Trigger file modification detection
echo "Test alert" > /tmp/suspicious_file.txt

# 2. Trigger process anomaly
powershell -Command "Get-Process"  # On Windows

# 3. Trigger failed authentication (for testing)
ssh wronguser@localhost

# 4. Check Wazuh dashboard within 60 seconds
# You should see alerts appearing!
```

### Expected Results

| Time | What You Should See |
|------|---------------------|
| 0-10 sec | Event logged by Wazuh agent |
| 10-30 sec | Rule correlation in Wazuh |
| 30-60 sec | Alert visible in dashboard |
| 1-2 min | Alert forwarded to TheHive (if configured) |
| 2-5 min | IOC checked against MISP (if configured) |

---

## 📊 Next Steps After Deployment

### Week 1: Stabilization
- Monitor system performance
- Tune detection rules (reduce false positives)
- Establish baseline metrics
- Train initial team on tools

### Week 2: Integration Deep-Dive
- Configure all playbooks
- Set up automated response actions
- Connect threat intelligence feeds
- Build custom dashboards

### Week 3: Operational Procedures
- Document SOPs for each tool
- Establish shift procedures
- Create escalation paths
- Conduct first tabletop exercise

### Week 4: Expansion
- Begin broader agent deployment
- Add more detection rules
- Integrate additional data sources
- Plan Phase 2 capabilities

---

## 🆘 Troubleshooting Common Issues

### Issue: Wazuh agents not connecting
```bash
# Check manager is listening
netstat -tlnp | grep 1514

# Verify agent config
cat /var/ossec/etc/ossec.conf | grep MANAGER

# Check firewall rules
iptables -L -n | grep 1515

# Restart agent
systemctl restart wazuh-agent
journalctl -u wazuh-agent -f
```

### Issue: OpenSearch out of memory
```bash
# Check heap usage
curl -k https://localhost:9200/_nodes/stats/jvm?pretty

# Increase memory limit
# Edit /etc/opensearch/opensearch.yml
# Set -Xms and -Xmx to 70% of available RAM

# Restart
systemctl restart opensearch
```

### Issue: TheHive slow response
```bash
# Check Cortex connectivity
curl http://cortex:9001/cortex/ping

# Review analyzer timeouts
# TheHive → Admin → Org → Cortex → Analyzers
# Reduce parallel analyzers if overloaded

# Scale Cortex horizontally
docker scale cortex=3
```

### Issue: MISP feed sync failing
```bash
# Check cron jobs running
docker exec misp-server crontab -l

# Manual feed fetch test
docker exec misp-server Console/cake Server fetchFeed [feed_id]

# Check network connectivity
docker exec misp-server ping google.com
```

---

## 📞 Support Resources

### Official Documentation
- **Wazuh:** https://documentation.wazuh.com/current/
- **TheHive:** https://thehive-project.org/docs/
- **MISP:** https://www.misp-project.org/docs/
- **OpenSearch:** https://opensearch.org/docs/latest/
- **Suricata:** https://suricata.readthedocs.io/
- **Grafana:** https://grafana.com/docs/

### Community Support
- **Wazuh Slack:** https://wazuh.com/community/
- **TheHive Discord:** https://discord.gg/thehive-project
- **MISP Discourse:** https://discourse.misp-community.org/
- **OpenSearch Forum:** https://forum.opensearch.org/

### Professional Support (Paid Options)
- **Wazuh Enterprise:** https://wazuh.com/pricing/
- **OpenSearch Support:** https://aws.amazon.com/opensearch/service/
- **TheHive Support:** Available via CERT-EU and partners

---

## 🎯 Success Criteria

Your open-source SOC is **successfully deployed** when:

✅ All components running without critical errors  
✅ Agents deployed on pilot systems (1,000+)  
✅ Alerts flowing through entire pipeline  
✅ Analysts can triage and investigate incidents  
✅ Automation handling routine tasks  
✅ Threat intelligence informing detections  
✅ Executives viewing meaningful dashboards  
✅ Team trained and following SOPs  

---

**Welcome to world-class, open-source cybersecurity!** 🌍🔒🇩🇿

*This Quick Start Guide is part of Algeria's National SOC Implementation Project*
*For full strategic plan, see: `06_World_Class_Benchmark_Open_Source_Plan.md`*
