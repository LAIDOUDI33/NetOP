# National SOC Project - Deployment Guide

## Quick Start

This repository contains the complete **National Security Operations Center (SOC) Implementation Project** for Algeria. It includes documentation, architecture specifications, a working dashboard application, operational frameworks, and resource planning.

---

## 📁 Project Structure

```
National_SOC_Complete_Project/
│
├── 01_Implementation_Plan/          # Strategic planning documents
│   ├── 00_Project_Overview.md       # Complete project overview
│   ├── Project_Governance.md        # Governance structure & policies
│   ├── Stakeholder_Management.md    # Stakeholder engagement plan
│   ├── Risk_Management.md           # Risk assessment & mitigation
│   ├── Executive_Summary.pdf        # High-level strategic overview
│   └── Strategic_Roadmap_2026-2030.pdf # 5-year implementation phases
│
├── 02_Technical_Architecture/       # Technical specifications
│   ├── Architecture_Specification.md # Complete technical architecture
│   ├── SIEM_Architecture.md         # SIEM design & configuration
│   ├── SOAR_Platform.md             # SOAR automation framework
│   ├── EDR_Solution.md              # Endpoint detection & response
│   ├── Network_Architecture.md      # Network topology & segmentation
│   └── Threat_Intelligence.md       # TI platform integration
│
├── 03_SOC_Dashboard/               # Working web application (Next.js)
│   ├── src/                        # React source code
│   │   ├── app/                    # Next.js App Router pages
│   │   └── components/ui/          # UI components (shadcn/ui)
│   ├── package.json                # Dependencies & scripts
│   └── README.md                   # Dashboard-specific docs
│
├── 04_Operational_Frameworks/      # Operational procedures
│   ├── SOC_Standard_Operating_Procedures.md # Master SOP document
│   ├── Incident_Response_Playbooks.md      # IR playbooks by threat type
│   ├── Escalation_Matrix.md         # Escalation procedures
│   └── Shift_Handover_Procedures.md # Operational shift procedures
│
├── 05_Budget_Resources/            # Financial planning
│   ├── Budget_Resource_Plan.md     # 5-year budget breakdown
│   └── Staffing_Plan.md            # Organizational structure
│
├── README.md                       # This file
└── .git/                           # Git repository
```

---

## 🚀 Getting Started

### Prerequisites

Before deploying any component, ensure you have:

1. **For Documentation Review:**
   - Any modern PDF reader
   - Markdown viewer (VS Code recommended)

2. **For SOC Dashboard:**
   - Node.js 18+ installed
   - npm or yarn package manager
   - Modern web browser

3. **For Full Deployment:**
   - Kubernetes cluster or Docker environment
   - Cloud infrastructure accounts (AWS/Azure/GCP)
   - Domain name for dashboard access

---

## 🖥️ SOC Dashboard Setup (Quick Start)

The SOC Dashboard is a **production-ready Next.js application** that can be run locally or deployed to cloud infrastructure.

### Local Development

```bash
# Navigate to the dashboard directory
cd 03_SOC_Dashboard

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:3000
```

### Production Build

```bash
# Create optimized production build
npm run build

# Start production server
npm run start

# The app will run on http://localhost:3000
```

### Docker Deployment

```bash
# Build Docker image
docker build -t national-soc-dashboard .

# Run container
docker run -p 3000:3000 national-soc-dashboard
```

### Environment Variables

Create a `.env.local` file for configuration:

```env
# Application
NEXT_PUBLIC_APP_NAME=National SOC Algeria
NEXT_PUBLIC_APP_URL=https://soc.gov.dz

# API Endpoints (when connecting to backend)
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws

# Feature Flags
NEXT_PUBLIC_ENABLE_DEMO_MODE=true
NEXT_PUBLIC_ENABLE_LIVE_DATA=false
```

---

## 📋 Documentation Overview

### Implementation Plan Documents

| Document | Purpose | Audience |
|----------|---------|----------|
| **Project Overview** | Complete project introduction and structure | All stakeholders |
| **Project Governance** | Decision-making framework, roles, compliance | Leadership, PMO |
| **Stakeholder Management** | Engagement strategy for all parties | PMO, Communications |
| **Risk Management** | Risk register, mitigation strategies | PMO, Leadership |

### Technical Architecture Documents

| Document | Purpose | Technical Depth |
|----------|---------|-----------------|
| **Architecture Specification** | Overall system design, components, data flows | Architect-level |
| **SIEM Architecture** | SIEM platform design, rules, integration | Security Engineer |
| **SOAR Platform** | Automation framework, playbooks, integrations | SOC Engineer |
| **EDR Solution** | Endpoint security deployment model | Endpoint Security Team |
| **Network Architecture** | Network topology, segmentation, security | Network Engineer |
| **Threat Intelligence** | TIP platform, intel lifecycle | Intel Analyst |

### Operational Frameworks

| Document | Purpose | Users |
|----------|---------|-------|
| **Standard Operating Procedures** | Day-to-day operations manual | All SOC Staff |
| **Incident Response Playbooks** | Step-by-step response guides | IR Team |
| **Escalation Matrix** | When and how to escalate | All Analysts |
| **Shift Handover Procedures** | Shift transition protocols | Shift Leads |

### Resource Planning

| Document | Purpose | Audience |
|----------|---------|----------|
| **Budget Resource Plan** | 5-year financial plan | Finance, Leadership |
| **Staffing Plan** | Organization structure, job descriptions | HR, Management |

---

## 🔧 Customization Guide

### Adapting to Your Environment

1. **Update References:** Search and replace "Algeria", "gov.dz", "DZD" with your country/domain/currency
2. **Adjust Scale:** Modify numbers in budget/staffing documents based on your scope
3. **Technology Selection:** Update vendor/product names if using different solutions
4. **Contact Information:** Replace placeholder names and contact details

### Branding the Dashboard

Edit `03_SOC_Dashboard/src/app/layout.tsx` and `page.tsx`:
- Change title and metadata
- Update color scheme in `globals.css`
- Replace logo references
- Customize metric thresholds

---

## 📊 Dashboard Features

The included SOC Dashboard provides:

### Real-Time Monitoring
- Live alert feed with severity classification
- Events Per Second (EPS) counter
- System health indicators
- On-call team status

### Key Metrics
- Total alerts (24h)
- Critical alerts count
- Active incidents
- MTTD / MTTR metrics
- Automation rate
- Endpoint coverage

### Interactive Views
- **Overview:** Executive summary with charts
- **Live Alerts:** Complete alert queue with filtering
- **Threat Intelligence:** Actor tracking, IOC statistics
- **Incidents:** Active incident management
- **Systems:** Infrastructure health monitoring

### Visual Elements
- Dark theme optimized for SOC operations
- Responsive design (desktop/tablet/mobile)
- Animated data visualizations
- Color-coded severity indicators

---

## 🔒 Security Considerations

### For Production Deployment

1. **Authentication:** Implement SSO/SAML integration
2. **Authorization:** Role-based access control (RBAC)
3. **Encryption:** TLS 1.3 for all connections
4. **Audit Logging:** All user actions logged
5. **Network Security:** Deploy within secure network zone
6. **Data Protection:** Classify all displayed data appropriately

### Recommended Security Headers

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## 🌐 Deployment Options

### Option 1: Vercel (Recommended for Next.js)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# For production
vercel --prod
```

### Option 2: AWS

```bash
# Build the application
npm run build

# Deploy to S3 + CloudFront
aws s3 sync .next/ s3://your-bucket
# Configure CloudFront distribution
```

### Option 3: Self-Hosted (Docker/Kubernetes)

See `03_SOC_Dashboard/docker-compose.yml` for reference configuration.

---

## 📞 Support & Contributing

### Getting Help

- Review documentation in relevant folder
- Check the README.md in each subdirectory
- Open an issue on GitHub for bugs or questions

### Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request with clear description

### Reporting Issues

When reporting issues, include:
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Environment details (OS, browser, Node version)

---

## 📜 License

This project is created for the **People's Democratic Republic of Algeria's National Cyber Defense Initiative**.

For government use and adaptation, please ensure proper authorization from relevant authorities.

---

## 🙏 Acknowledgments

This project incorporates best practices from:
- NIST Cybersecurity Framework
- MITRE ATT&CK Framework
- SANS Incident Response Process
- ISO/IEC 27001:2022 Standards
- FIRST (Forum of Incident Response Teams) Guidelines

---

*Built with dedication to protecting Algeria's digital future.* 🇩🇿
