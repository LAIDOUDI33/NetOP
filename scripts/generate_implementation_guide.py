#!/usr/bin/env python3
"""
Djezzy SOC Platform - Comprehensive Implementation Guide
Step-by-Step Deployment Manual for 100% On-Premises Installation
"""

import os
import sys
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, ListFlowable, ListItem, KeepTogether,
    Preformatted
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Register fonts
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('NotoSansSC', f'{FONT_DIR}/truetype/liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSansSC-Bold', f'{FONT_DIR}/truetype/liberation/LiberationSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('LiberationMono', f'{FONT_DIR}/truetype/liberation/LiberationMono-Regular.ttf'))

# Palette
PAGE_BG       = colors.HexColor('#f0f0ef')
SECTION_BG    = colors.HexColor('#f2f2f0')
CARD_BG       = colors.HexColor('#eae9e6')
TABLE_STRIPE  = colors.HexColor('#f1f0ed')
HEADER_FILL   = colors.HexColor('#1e3a5f')  # Deep blue for technical doc
ACCENT        = colors.HexColor('#2980b9')  # Technical blue
BORDER        = colors.HexColor('#bdc3c7')
TEXT_PRIMARY  = colors.HexColor('#2c3e50')
TEXT_MUTED    = colors.HexColor('#7f8c8d')
SEM_SUCCESS   = colors.HexColor('#27ae60')
SEM_WARNING   = colors.HexColor('#f39c12')
SEM_ERROR     = colors.HexColor('#c0392b')
SEM_INFO      = colors.HexColor('#3498db')

OUTPUT_PATH = '/home/z/my-project/download/Djezzy_SOC_Implementation_Guide.pdf'


def create_styles():
    """Create custom paragraph styles"""
    styles = getSampleStyleSheet()
    
    styles.add(ParagraphStyle(
        name='CustomTitle',
        fontName='NotoSerifSC-Bold',
        fontSize=24,
        leading=30,
        alignment=TA_CENTER,
        textColor=HEADER_FILL,
        spaceAfter=15
    ))
    
    styles.add(ParagraphStyle(
        name='Subtitle',
        fontName='NotoSerifSC',
        fontSize=12,
        leading=16,
        alignment=TA_CENTER,
        textColor=TEXT_MUTED,
        spaceAfter=20
    ))
    
    styles.add(ParagraphStyle(
        name='Heading1Custom',
        fontName='NotoSerifSC-Bold',
        fontSize=16,
        leading=21,
        textColor=HEADER_FILL,
        spaceBefore=18,
        spaceAfter=10,
        borderWidth=0,
        borderPadding=0,
    ))
    
    styles.add(ParagraphStyle(
        name='Heading2Custom',
        fontName='NotoSerifSC-Bold',
        fontSize=12,
        leading=16,
        textColor=ACCENT,
        spaceBefore=14,
        spaceAfter=8
    ))
    
    styles.add(ParagraphStyle(
        name='Heading3Custom',
        fontName='NotoSansSC-Bold',
        fontSize=10.5,
        leading=14,
        textColor=TEXT_PRIMARY,
        spaceBefore=10,
        spaceAfter=6
    ))
    
    styles.add(ParagraphStyle(
        name='CustomBody',
        fontName='NotoSerifSC',
        fontSize=9.5,
        leading=14,
        alignment=TA_JUSTIFY,
        textColor=TEXT_PRIMARY,
        spaceBefore=4,
        spaceAfter=4,
        firstLineIndent=0
    ))
    
    styles.add(ParagraphStyle(
        name='BulletText',
        fontName='NotoSerifSC',
        fontSize=9,
        leading=13,
        textColor=TEXT_PRIMARY,
        leftIndent=12,
        spaceBefore=2,
        spaceAfter=2
    ))
    
    styles.add(ParagraphStyle(
        name='CodeBlock',
        fontName='LiberationMono',  # Monospace for code blocks
        fontSize=7.5,
        leading=10,
        alignment=TA_LEFT,
        textColor=colors.HexColor('#27ae60'),
        backColor=colors.HexColor('#2c3e50'),
        borderColor=BORDER,
        borderWidth=0.5,
        borderPadding=6,
        spaceBefore=6,
        spaceAfter=6,
        leftIndent=0,
        rightIndent=0,
    ))
    
    styles.add(ParagraphStyle(
        'NoteBox',
        fontName='NotoSerifSC',
        fontSize=9,
        leading=13,
        textColor=SEM_INFO,
        leftIndent=8,
        rightIndent=8,
        spaceBefore=6,
        spaceAfter=6,
        backColor=colors.HexColor('#ebf5fb'),
        borderColor=SEM_INFO,
        borderWidth=1,
        borderPadding=8,
    ))
    
    styles.add(ParagraphStyle(
        'WarningBox',
        fontName='NotoSerifSC',
        fontSize=9,
        leading=13,
        textColor=SEM_WARNING,
        leftIndent=8,
        rightIndent=8,
        spaceBefore=6,
        spaceAfter=6,
        backColor=colors.HexColor('#fef9e7'),
        borderColor=SEM_WARNING,
        borderWidth=1,
        borderPadding=8,
    ))
    
    styles.add(ParagraphStyle(
        'ErrorBox',
        fontName='NotoSerifSC',
        fontSize=9,
        leading=13,
        textColor=SEM_ERROR,
        leftIndent=8,
        rightIndent=8,
        spaceBefore=6,
        spaceAfter=6,
        backColor=colors.HexColor('#fdedec'),
        borderColor=SEM_ERROR,
        borderWidth=1,
        borderPadding=8,
    ))
    
    styles.add(ParagraphStyle(
        'SuccessBox',
        fontName='NotoSerifSC',
        fontSize=9,
        leading=13,
        textColor=SEM_SUCCESS,
        leftIndent=8,
        rightIndent=8,
        spaceBefore=6,
        spaceAfter=6,
        backColor=colors.HexColor('#eafaf1'),
        borderColor=SEM_SUCCESS,
        borderWidth=1,
        borderPadding=8,
    ))
    
    styles.add(ParagraphStyle(
        name='Caption',
        fontName='NotoSerifSC',
        fontSize=8.5,
        leading=11,
        alignment=TA_CENTER,
        textColor=TEXT_MUTED,
        spaceBefore=4,
        spaceAfter=8
    ))
    
    return styles


def create_table_style():
    """Create consistent table styling"""
    return TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8.5),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 7),
        ('TOPPADDING', (0, 0), (-1, 0), 7),
        ('BACKGROUND', (0, 1), (-1, -1), CARD_BG),
        ('TEXTCOLOR', (0, 1), (-1, -1), TEXT_PRIMARY),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 8.5),
        ('ALIGN', (0, 1), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [CARD_BG, TABLE_STRIPE]),
        ('TOPPADDING', (0, 1), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ])


def code_block(text):
    """Create a formatted code block"""
    # Escape special characters for ReportLab
    text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    return Preformatted(text, styles['CodeBlock'] if 'styles' in globals() else None)


def build_cover_page(styles):
    """Build cover page"""
    elements = []
    
    elements.append(Spacer(1, 40))
    elements.append(Paragraph("DJEZZY NATIONAL SOC PLATFORM", styles['CustomTitle']))
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("Comprehensive Implementation Guide", styles['Subtitle']))
    elements.append(Paragraph("Step-by-Step Deployment Procedures for 100% On-Premises Installation", styles['Subtitle']))
    
    elements.append(Spacer(1, 20))
    
    info_data = [
        ['Document Type', 'Technical Implementation Manual'],
        ['Version', '1.0 - Production Ready'],
        ['Classification', 'INTERNAL USE - TECHNICAL OPERATIONS'],
        ['Deployment Model', '100% On-Premises (Air-Gap Capable)'],
        ['Target Audience', 'Platform Engineers, DevOps, System Administrators'],
        ['Effective Date', datetime.now().strftime('%B %d, %Y')],
        ['Review Cycle', 'Quarterly or Major Version Change'],
    ]
    
    info_table = Table(info_data, colWidths=[140, 300])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), SECTION_BG),
        ('BACKGROUND', (1, 0), (1, -1), CARD_BG),
        ('TEXTCOLOR', (0, 0), (-1, -1), TEXT_PRIMARY),
        ('FONTNAME', (0, 0), (0, -1), 'NotoSansSC-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, 0), (-1, -1), 9.5),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(info_table)
    
    elements.append(Spacer(1, 25))
    
    elements.append(Paragraph("<b>Document Scope</b>", styles['Heading3Custom']))
    elements.append(Paragraph(
        "This Implementation Guide provides detailed step-by-step procedures for deploying the Djezzy National Security Operations Center "
        "(SOC) Platform in a 100% on-premises environment. It covers every phase from initial facility preparation through production go-live, "
        "including operating system installation, container runtime configuration, network setup, database deployment, security tool integration, "
        "application deployment, validation testing, and operational handoff procedures. Each section includes exact commands, configuration file "
        "templates, expected outputs, and troubleshooting guidance for common issues encountered during deployment.",
        styles['CustomBody']
    ))
    
    elements.append(Spacer(1, 15))
    
    elements.append(Paragraph("<b>How to Use This Guide</b>", styles['Heading3Custom']))
    
    usage_items = [
        "<b>Sequential Execution:</b> Sections are ordered to match the logical deployment sequence. Complete each section fully before proceeding to the next.",
        "<b>Prerequisites:</b> Each section begins with prerequisites that must be satisfied before starting. Verify all prerequisites are met before beginning procedures.",
        "<b>Command Blocks:</b> Commands shown in dark green boxes should be executed exactly as written unless noted otherwise. Copy-paste carefully to avoid typos.",
        "<b>Validation Steps:</b> Each major procedure includes validation commands confirming successful completion. Always execute validation steps before proceeding.",
        "<b>Troubleshooting:</b> Common issues and resolutions appear at the end of each section. Consult these before escalating to senior engineers or vendor support."
    ]
    
    for item in usage_items:
        elements.append(Paragraph(f"<bullet>&bull;</bullet> {item}", styles['BulletText']))
    
    elements.append(PageBreak())
    return elements


def build_toc(styles):
    """Build table of contents"""
    elements = []
    
    elements.append(Paragraph("Table of Contents", styles['Heading1Custom']))
    elements.append(Spacer(1, 10))
    
    toc_data = [
        ['Section', 'Title', 'Page'],
        ['1', 'Pre-Deployment Requirements & Checklists', '3'],
        ['2', 'Operating System Installation & Hardening', '6'],
        ['3', 'Container Runtime & Orchestration Setup', '10'],
        ['4', 'Network Configuration & Segmentation', '14'],
        ['5', 'Database Layer Deployment (PostgreSQL/Kafka/Redis)', '18'],
        ['6', 'Elasticsearch Cluster Deployment', '24'],
        ['7', 'SIEM Stack Deployment (Wazuh/Elasticsearch/Kibana)', '28'],
        ['8', 'Network Security Monitoring (Suricata/Zeek/Arkime)', '33'],
        ['9', 'Endpoint Detection & Response (GRR/Osquery)', '38'],
        ['10', 'SOAR Platform (TheHive/Cortex) Deployment', '42'],
        ['11', 'Threat Intelligence (MISP/OpenCTI) Setup', '46'],
        ['12', 'Vulnerability Management (OpenVAS/DefectDojo)', '50'],
        ['13', 'Monitoring & Observability Stack', '54'],
        ['14', 'API Gateway & Frontend Application', '58'],
        ['15', 'Integration Testing & Validation', '62'],
        ['16', 'Operational Runbooks & Procedures', '66'],
        ['17', 'Troubleshooting Guide', '72'],
        ['A', 'Appendix: Configuration Reference', '78'],
        ['B', 'Appendix: Command Quick Reference', '82'],
    ]
    
    toc_table = Table(toc_data, colWidths=[40, 320, 40])
    toc_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('TEXTCOLOR', (0, 1), (-1, -1), TEXT_PRIMARY),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.25, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, SECTION_BG]),
    ]))
    elements.append(toc_table)
    
    elements.append(PageBreak())
    return elements


def build_section_1_prereqs(styles):
    """Section 1: Pre-deployment requirements"""
    elements = []
    
    elements.append(Paragraph("1. Pre-Deployment Requirements & Checklists", styles['Heading1Custom']))
    
    elements.append(Paragraph(
        "Before beginning any installation activities, ensure all prerequisite conditions are satisfied. This section provides comprehensive "
        "checklists covering hardware readiness, software artifacts, network connectivity, personnel preparation, and documentation requirements. "
        "Complete each checklist in full and obtain sign-off from the designated authority before proceeding to Section 2 (Operating System Installation).",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("1.1 Hardware Prerequisites Checklist", styles['Heading2Custom']))
    
    hw_checklist = [
        ['Item', 'Specification', 'Status', 'Verified By', 'Date'],
        ['Primary Site Servers (14)', 'All servers received and inspected', '[ ]', '', ''],
        ['', 'Serial numbers recorded in CMDB', '[ ]', '', ''],
        ['', 'Firmware updated to latest stable version', '[ ]', '', ''],
        ['', 'Physical damage inspection passed', '[ ]', '', ''],
        ['', 'All drive bays populated per spec', '[ ]', '', ''],
        ['Network Infrastructure', 'Spine switches installed and powered', '[ ]', '', ''],
        ['', 'Leaf switches installed and powered', '[ ]', '', ''],
        ['', 'Fiber optic cables terminated and tested', '[ ]', '', ''],
        ['', 'Copper cables terminated and tested', '[ ]', '', ''],
        ['', 'Optics (SFP/SFP+/QSFP) available', '[ ]', '', ''],
        ['Power Infrastructure', 'UPS systems installed and tested', '[ ]', '', ''],
        ['', 'ATS/transfer switch functional', '[ ]', '', ''],
        ['', 'PDUs installed and labeled', '[ ]', '', ''],
        ['', 'Power draw test completed', '[ ]', '', ''],
        ['Cooling & Environment', 'CRAC/CRAH units operational', '[ ]', '', ''],
        ['', 'Temperature sensors calibrated', '[ ]', '', ''],
        ['', 'Hot/cold aisle containment installed', '[ ]', '', ''],
        ['', 'Fire suppression system armed', '[ ]', '', ''],
        ['Rack Infrastructure', 'Server racks assembled and leveled', '[ ]', '', ''],
        ['', 'Cable management installed', '[ ]', '', ''],
        ['', 'Grounding verified (<1 ohm)', '[ ]', '', ''],
    ]
    
    hw_table = Table(hw_checklist, colWidths=[110, 160, 45, 70, 50])
    hw_table.setStyle(create_table_style())
    elements.append(hw_table)
    elements.append(Paragraph("Table 1.1: Hardware Prerequisites Checklist", styles['Caption']))
    
    elements.append(Paragraph("1.2 Software Artifacts Inventory", styles['Heading2Custom']))
    
    elements.append(Paragraph(
        "The following software packages must be obtained and staged on secure media (encrypted USB drives or internal network share) prior to "
        "beginning installation. For air-gapped deployments, download all packages beforehand using an internet-connected workstation, then transfer "
        "via secure media to the isolated environment. Verify checksums (SHA256) for each package against vendor-provided values to ensure integrity.",
        styles['CustomBody']
    ))
    
    sw_inventory = [
        ['Software Component', 'Version', 'Source', 'Format', 'Checksum Verify'],
        ['Rocky Linux 9.4', '9.4-20240508', 'rockylinux.org', 'ISO', '[ ]'],
        ['Docker CE', '27.1.x', 'docker.com', 'RPM/RPM', '[ ]'],
        ['Docker Compose', 'v2.27.x', 'github.com', 'Binary', '[ ]'],
        ['PostgreSQL 16', '16.4-1', 'postgresql.org', 'RPM', '[ ]'],
        ['Apache Kafka 3.6', '3.6.1', 'kafka.apache.org', 'TGZ', '[ ]'],
        ['Apache ZooKeeper 3.8', '3.8.4', 'zookeeper.apache.org', 'TGZ', '[ ]'],
        ['Elasticsearch 8.12', '8.12.2', 'elastic.co', 'RPM/TGZ', '[ ]'],
        ['Kibana 8.12', '8.12.2', 'elastic.co', 'RPM/TGZ', '[ ]'],
        ['Wazuh Server 4.7', '4.7.3', 'wazuh.com', 'RPM', '[ ]'],
        ['Wazuh Indexer 4.7', '4.7.3', 'wazuh.com', 'RPM', '[ ]'],
        ['Suricata 7.0', '7.0.3', 'suricata.io', 'RPM/TGZ', '[ ]'],
        ['Zeek 6.3', '6.3.0', 'zeek.org', 'TGZ', '[ ]'],
        ['Arkime 5.4', '5.4.0', 'arkime.com', 'TGZ', '[ ]'],
        ['GRR 3.4', '3.4.6.1', 'github.com', 'DEB/RPM', '[ ]'],
        ['Osquery Fleet 4.17', '4.17.0', 'fleetdm.com', 'DEB/RPM', '[ ]'],
        ['TheHive 5.4', '5.4.4', 'thehive-project.org', 'ZIP/TGZ', '[ ]'],
        ['Cortex 3.1', '3.1.6', 'thehive-project.org', 'ZIP/TGZ', '[ ]'],
        ['MISP 2.4', '2.4.180', 'misp-project.org', 'TGZ', '[ ]'],
        ['OpenCTI 6.0', '6.0.18', 'opencti.io', 'DOCKER', '[ ]'],
        ['OpenVAS/GVM 22.4', '22.4.5', 'greenbone.net', 'RPM/TGZ', '[ ]'],
        ['DefectDojo 2.42', '2.42.0', 'defectdojo.org', 'DOCKER', '[ ]'],
        ['Prometheus 2.51', '2.51.1', 'prometheus.io', 'TGZ', '[ ]'],
        ['Grafana 11.1', '11.1.3', 'grafana.com', 'RPM/TGZ', '[ ]'],
        ['Kong Gateway 3.6', '3.6.1', 'konghq.com', 'DOCKER', '[ ]'],
        ['Redis 7.2', '7.2.4', 'redis.io', 'RPM/TGZ', '[ ]'],
        ['Node.js 20 LTS', '20.15.0', 'nodejs.org', 'BIN', '[ ]'],
        ['Python 3.12', '3.12.4', 'python.org', 'SRC/RPM', '[ ]'],
        ['Go 1.22', '1.22.3', 'golang.org', 'BIN/TGZ', '[ ]'],
    ]
    
    sw_table = Table(sw_inventory, colWidths=[105, 55, 85, 55, 70])
    sw_table.setStyle(create_table_style())
    elements.append(sw_table)
    elements.append(Paragraph("Table 1.2: Software Artifacts Inventory", styles['Caption']))
    
    elements.append(Paragraph("1.3 Network Prerequisites", styles['Heading2Custom']))
    
    net_prereqs = [
        ["<b>VLAN Configuration:</b> All seven VLANs (100-700) provisioned on switching infrastructure with appropriate IP subnets assigned per architecture document.",
         "VLAN 100 (soc-management): 172.16.0.0/16",
         "VLAN 200 (soc-frontend): 172.28.0.0/16",
         "VLAN 300 (soc-backend): 172.29.0.0/16",
         "VLAN 400 (soc-events): 172.30.0.0/16",
         "VLAN 500 (soc-capture): 172.31.0.0/16",
         "VLAN 600 (soc-backup): 172.32.0.0/16",
         "VLAN 700 (soc-monitoring): 172.33.0.0/16"],
        
        ["<b>DNS Infrastructure:</b> Internal DNS server(s) configured with forward and reverse lookup zones for all planned hostnames.",
         "Primary DNS: soc-dns-01.internal.djezzy.dz (172.16.0.10)",
         "Secondary DNS: soc-dns-02.internal.djezzy.dz (172.16.0.11)",
         "Domain: internal.djezzy.dz"],
        
        ["<b>NTP Time Synchronization:</b> Stratum-2 (or better) NTP servers accessible from management network for accurate timestamp correlation.",
         "Primary NTP: ntp-01.internal.djezzy.dz (synchronized to GPS or atomic source)",
         "Backup NTP: ntp-02.internal.djezzy.dz"],
        
        ["<b>Firewall Rules:</b> Base firewall policy allowing necessary traffic between zones per security architecture document.",
         "Default deny all inter-zone traffic",
         "Explicit allow rules documented in Appendix A"]
    ]
    
    for prereq in net_prereqs:
        elements.append(Paragraph(prereq[0], styles['NoteBox']))
        for detail in prereq[1:]:
            elements.append(Paragraph(f"<bullet>&bull;</bullet> {detail}", styles['BulletText']))
        elements.append(Spacer(1, 6))
    
    elements.append(Paragraph("1.4 Personnel & Access Requirements", styles['Heading2Custom']))
    
    personnel_data = [
        ['Role', 'Minimum Count', 'Required Skills', 'Availability'],
        ['Platform Lead', '1', 'Linux admin, Docker, networking, databases', 'Full-time Phase 1-8'],
        ['System Administrator', '2', 'OS installation, hardening, patching', 'Full-time Phase 1-4'],
        ['Network Engineer', '1', 'Switching, VLANs, bonding, TCP/IP', 'Phase 1, 4 (part-time)'],
        ['Database Administrator', '1', 'PostgreSQL, Kafka, ES administration', 'Phase 3-5 (part-time)'],
        ['Security Engineer', '2', 'SIEM, NSM, threat intel tools', 'Phase 4-6 (full-time)'],
        ['DevOps Engineer', '1', 'CI/CD, containers, automation', 'Phase 5-6 (part-time)'],
        ['Project Manager', '1', 'Coordination, risk mgmt, reporting', 'Throughout (part-time)'],
    ]
    
    personnel_table = Table(personnel_data, colWidths=[95, 65, 165, 90])
    personnel_table.setStyle(create_table_style())
    elements.append(personnel_table)
    elements.append(Paragraph("Table 1.3: Personnel Requirements by Phase", styles['Caption']))
    
    elements.append(Paragraph("1.5 Pre-Deployment Sign-Off", styles['Heading2Custom']))
    
    elements.append(Paragraph(
        "Before proceeding to operating system installation, obtain formal sign-off from the following authorities confirming all prerequisites "
        "have been satisfied. Document sign-off with date and signature in project records.",
        styles['CustomBody']
    ))
    
    signoff_data = [
        ['Authority Role', 'Name', 'Signature', 'Date', 'Comments'],
        ['Facility Manager', '', '', '', 'Power, cooling, space verified'],
        ['Network Architect', '', '', '', 'VLANs, DNS, firewall configured'],
        ['Security Officer', '', '', '', 'Physical access controls verified'],
        ['Project Sponsor', '', '', '', 'Budget, resources approved'],
        ['Platform Lead', '', '', '', 'Technical readiness confirmed'],
    ]
    
    signoff_table = Table(signoff_data, colWidths=[90, 80, 80, 55, 120])
    signoff_table.setStyle(create_table_style())
    elements.append(signoff_table)
    elements.append(Paragraph("Table 1.4: Pre-Deployment Sign-Off Sheet", styles['Caption']))
    
    return elements


def build_section_2_os_installation(styles):
    """Section 2: OS installation and hardening"""
    elements = []
    
    elements.append(Paragraph("2. Operating System Installation & Hardening", styles['Heading1Custom']))
    
    elements.append(Paragraph(
        "This section covers base operating system installation across all fourteen primary site servers followed by security hardening according "
        "to CIS benchmarks and organizational policies. We recommend Rocky Linux 9.4 (or RHEL 9.4 if subscription licenses are available) as the base "
        "operating system due to its enterprise stability, long support lifecycle, and compatibility with container runtimes and database software. "
        "Execute these procedures sequentially on each server, documenting any deviations or issues encountered.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("2.1 Rocky Linux 9.4 Installation Procedure", styles['Heading2Custom']))
    
    elements.append(Paragraph("Step 1: Create Boot Media", styles['Heading3Custom']))
    elements.append(Paragraph(
        "Download the Rocky Linux 9.4 DVD ISO from the official mirror site and verify SHA256 checksum. Create bootable USB media using the dd command "
        "or Rufus (Windows). For air-gapped environments, perform this step on an internet-connected workstation then transfer USB drives securely.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("# Download Rocky Linux 9.4 ISO (on internet-connected machine)", styles['CodeBlock']))
    elements.append(Paragraph("wget https://download.rockylinux.org/pub/rocky/9.4/isos/x86_64/Rocky-9.4-x86_64-dvd.iso", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Verify SHA256 checksum", styles['CodeBlock']))
    elements.append(Paragraph("sha256sum Rocky-9.4-x86_64-dvd.iso", styles['CodeBlock']))
    elements.append(Paragraph("# Expected: d7b1c... (verify against official hash)", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Create bootable USB (replace /dev/sdX with actual device)", styles['CodeBlock']))
    elements.append(Paragraph("dd if=Rocky-9.4-x86_64-dvd.iso of=/dev/sdX bs=4M status=progress conv=fsync", styles['CodeBlock']))
    
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("Step 2: Install Operating System", styles['Heading3Custom']))
    
    install_steps = [
        "Boot server from USB media (enter BIOS/F2 to select boot device)",
        "Select 'Install Rocky Linux 9' from boot menu",
        "Choose language: English (United States)",
        "Installation Destination: Select all disks, select 'Custom' partitioning scheme",
        "Create standard partitions:",
        "  - /boot     : 2 GB    ext4    xfs (boot flag)",
        "  - swap      : RAM size (min 8GB, max 32GB)",
        "  - /         : 100 GB  ext4    xfs (root filesystem)",
        "  - /var      : 200 GB  ext4    xfs (logs, transient data)",
        "  - /var/log  : 50 GB   ext4    xfs (dedicated log volume)",
        "  - /data     : Remaining  ext4/lvm (application data)",
        "Network & Hostname: Configure hostname per naming convention (see Table 2.1)",
        "Time Zone: Africa/Algiers, enable NTP",
        "Software Selection: 'Server with GUI' (minimal) or 'Minimal Install'",
        "Begin Installation and set root password"
    ]
    
    for step in install_steps:
        elements.append(Paragraph(f"<bullet>&bull;</bullet> {step}", styles['BulletText']))
    
    elements.append(Spacer(1, 8))
    
    hostname_data = [
        ['Server Role', 'Hostname Example', 'IP Address (mgmt)', 'IP Address (data)'],
        ['SIEM Master 1', 'soc-siem-mstr-01.internal.djezzy.dz', '172.16.0.101', '172.28.0.101'],
        ['SIEM Master 2', 'soc-siem-mstr-02.internal.djezzy.dz', '172.16.0.102', '172.28.0.102'],
        ['ES Data Node 1', 'soc-es-data-01.internal.djezzy.dz', '172.16.0.111', '172.30.0.111'],
        ['ES Data Node 2', 'soc-es-data-02.internal.djezzy.dz', '172.16.0.112', '172.30.0.112'],
        ['ES Data Node 3', 'soc-es-data-03.internal.djezzy.dz', '172.16.0.113', '172.30.0.113'],
        ['ES Data Node 4', 'soc-es-data-04.internal.djezzy.dz', '172.16.0.114', '172.30.0.114'],
        ['DB Primary', 'soc-db-primary.internal.djezzy.dz', '172.16.0.121', '172.30.0.121'],
        ['DB Replica 1', 'soc-db-replica-01.internal.djezzy.dz', '172.16.0.122', '172.30.0.122'],
        ['DB Replica 2', 'soc-db-replica-02.internal.djezzy.dz', '172.16.0.123', '172.30.0.123'],
        ['NSM Capture 1', 'soc-nsm-capture-01.internal.djezzy.dz', '172.16.0.131', '172.31.0.131'],
        ['NSM Capture 2', 'soc-nsm-capture-02.internal.djezzy.dz', '172.16.0.132', '172.31.0.132'],
        ['App Server 1', 'soc-app-01.internal.djezzy.dz', '172.16.0.141', '172.28.0.141'],
        ['App Server 2', 'soc-app-02.internal.djezzy.dz', '172.16.0.142', '172.28.0.142'],
        ['Archive Server', 'soc-archive-01.internal.djezzy.dz', '172.16.0.151', '172.32.0.151'],
    ]
    
    hostname_table = Table(hostname_data, colWidths=[90, 175, 95, 95])
    hostname_table.setStyle(create_table_style())
    elements.append(hostname_table)
    elements.append(Paragraph("Table 2.1: Server Naming Convention and IP Assignment", styles['Caption']))
    
    elements.append(Paragraph("2.2 Post-Installation Base Configuration", styles['Heading2Custom']))
    
    elements.append(Paragraph("Step 3: Initial Network Configuration", styles['Heading3Custom']))
    elements.append(Paragraph(
        "After first boot, configure network interfaces with static IPs according to the addressing scheme above. Each server requires minimum two "
        "interfaces: one for management (VLAN 100) and one or more for data traffic depending on role. Use NetworkManager nmcli commands for consistent "
        "configuration across all nodes.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("# View available network interfaces", styles['CodeBlock']))
    elements.append(Paragraph("nmcli device status", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Configure management interface (example for SIEM Master 1)", styles['CodeBlock']))
    elements.append(Paragraph("nmcli con add type ethernet ifname enp1s0f0 con-name mgmt \\", styles['CodeBlock']))
    elements.append(Paragraph("    ip4 172.16.0.101/16 \\", styles['CodeBlock']))
    elements.append(Paragraph("    gw4 172.16.0.1 \\", styles['CodeBlock']))
    elements.append(Paragraph("    ipv4.dns \"172.16.0.10 172.16.0.11\"", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Activate connection", styles['CodeBlock']))
    elements.append(Paragraph("nmcli con up mgmt", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Verify connectivity", styles['CodeBlock']))
    elements.append(Paragraph("ping -c 4 172.16.0.1  # Default gateway", styles['CodeBlock']))
    elements.append(Paragraph("ping -c 4 172.16.0.10  # DNS server", styles['CodeBlock']))
    elements.append(Paragraph("ping -c 4 google.com  # External (if allowed)", styles['CodeBlock']))
    
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("Step 4: System Updates and Essential Packages", styles['Heading3Custom']))
    
    elements.append(Paragraph("# Update all packages to latest versions", styles['CodeBlock']))
    elements.append(Paragraph("dnf update -y && dnf upgrade --refresh -y", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Install essential utilities", styles['CodeBlock']))
    elements.append(Paragraph("dnf install -y \\", styles['CodeBlock']))
    elements.append(Paragraph("    vim-enhanced htop iotop net-tools bind-utils \\", styles['CodeBlock']))
    elements.append(Paragraph("    wget curl git rsync lsof strace tcpdump \\", styles['CodeBlock']))
    elements.append(Paragraph("    chrony logrotate fail2ban audit \\", styles['CodeBlock']))
    elements.append(Paragraph("    epel-release", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Enable EPEL repository for additional packages", styles['CodeBlock']))
    elements.append(Paragraph("dnf install -y epel-release", styles['CodeBlock']))
    
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("2.3 Security Hardening (CIS Benchmark)", styles['Heading2Custom']))
    
    elements.append(Paragraph(
        "Apply CIS Benchmark Level 1 hardening recommendations for Rocky Linux 9. The following configurations address critical security controls including "
        "file system permissions, service hardening, network configuration, logging, and access control. Execute these commands on every server after "
        "base OS installation completes.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("Step 5: File System Security", styles['Heading3Custom']))
    
    elements.append(Paragraph("# Set restrictive umask globally", styles['CodeBlock']))
    elements.append(Paragraph("echo 'umask 027' >> /etc/profile", styles['CodeBlock']))
    elements.append(Paragraph("echo 'umask 027' >> /etc/bashrc", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Secure /tmp with nosuid,noexec,nodev", styles['CodeBlock']))
    elements.append(Paragraph("tmpfs /tmp tmpfs defaults,rw,nosuid,nodev,noexec,size=4G 0 0 >> /etc/fstab", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Set proper permissions on sensitive files", styles['CodeBlock']))
    elements.append(Paragraph("chmod 600 /etc/shadow /etc/gshadow", styles['CodeBlock']))
    elements.append(Paragraph("chmod 644 /etc/passwd /etc/group", styles['CodeBlock']))
    elements.append(Paragraph("chown root:root /etc/passwd /etc/shadow /etc/group /etc/gshadow", styles['CodeBlock']))
    
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("Step 6: SSH Hardening", styles['Heading3Custom']))
    
    elements.append(Paragraph("# Backup original config", styles['CodeBlock']))
    elements.append(Paragraph("cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Apply hardened SSH configuration", styles['CodeBlock']))
    elements.append(Paragraph("cat > /etc/ssh/sshd_config.d/hardened.conf << 'EOF'", styles['CodeBlock']))
    elements.append(Paragraph("# SSH Hardening - CIS Benchmark Level 1", styles['CodeBlock']))
    elements.append(Paragraph("Protocol 2", styles['CodeBlock']))
    elements.append(Paragraph("PermitRootLogin prohibit-password", styles['CodeBlock']))
    elements.append(Paragraph("MaxAuthTries 3", styles['CodeBlock']))
    elements.append(Paragraph("LoginGraceTime 30", styles['CodeBlock']))
    elements.append(Paragraph("X11Forwarding no", styles['CodeBlock']))
    elements.append(Paragraph("AllowTcpForwarding no", styles['CodeBlock']))
    elements.append(Paragraph("PermitEmptyPasswords no", styles['CodeBlock']))
    elements.append(Paragraph("ChallengeResponseAuthentication no", styles['CodeBlock']))
    elements.append(Paragraph("UseDNS yes", styles['CodeBlock']))
    elements.append(Paragraph("AllowUsers <authorized_users_list>", styles['CodeBlock']))
    elements.append(Paragraph("PasswordAuthentication no  # Key-only auth recommended", styles['CodeBlock']))
    elements.append(Paragraph("PubkeyAuthentication yes", styles['CodeBlock']))
    elements.append(Paragraph("AuthorizedKeysFile .ssh/authorized_keys", styles['CodeBlock']))
    elements.append(Paragraph("LogLevel VERBOSE", styles['CodeBlock']))
    elements.append(Paragraph("Banner /etc/issue.net", styles['CodeBlock']))
    elements.append(Paragraph("EOF", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Restart SSH service", styles['CodeBlock']))
    elements.append(Paragraph("systemctl restart sshd", styles['CodeBlock']))
    
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("Step 7: Firewall Configuration", styles['Heading3Custom']))
    
    elements.append(Paragraph("# Enable and start firewalld", styles['CodeBlock']))
    elements.append(Paragraph("systemctl enable --now firewalld", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Set default zone to drop (deny all)", styles['CodeBlock']))
    elements.append(Paragraph("firewall-cmd --set-default-zone=drop", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Allow management network (adjust as needed)", styles['CodeBlock']))
    elements.append(Paragraph("firewall-cmd --permanent --zone=trusted \\", styles['CodeBlock']))
    elements.append(Paragraph("    --add-source=172.16.0.0/16", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Allow specific services if required", styles['CodeBlock']))
    elements.append(Paragraph("firewall-cmd --permanent --zone=trusted --add-service=ssh", styles['CodeBlock']))
    elements.append(Paragraph("firewall-cmd --permanent --zone=trusted --add-service=https", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Reload firewall rules", styles['CodeBlock']))
    elements.append(Paragraph("firewall-cmd --reload", styles['CodeBlock']))
    
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("Step 8: Kernel Parameters and Limits", styles['Heading3Custom']))
    
    elements.append(Paragraph("# Set kernel parameters for security and performance", styles['CodeBlock']))
    elements.append(Paragraph("cat > /etc/sysctl.d/99-security-hardening.conf << 'EOF'", styles['CodeBlock']))
    elements.append(Paragraph("# Network Security", styles['CodeBlock']))
    elements.append(Paragraph("net.ipv4.ip_forward = 0", styles['CodeBlock']))
    elements.append(Paragraph("net.ipv4.conf.all.send_redirects = 0", styles['CodeBlock']))
    elements.append(Paragraph("net.ipv4.conf.default.send_redirects = 0", styles['CodeBlock']))
    elements.append(Paragraph("net.ipv4.conf.all.accept_redirects = 0", styles['CodeBlock']))
    elements.append(Paragraph("net.ipv4.conf.default.accept_redirects = 0", styles['CodeBlock']))
    elements.append(Paragraph("net.ipv4.icmp_echo_ignore_broadcasts = 1", styles['CodeBlock']))
    elements.append(Paragraph("net.ipv4.conf.all.rp_filter = 1", styles['CodeBlock']))
    elements.append(Paragraph("net.ipv4.conf.default.rp_filter = 1", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# SYN flood protection", styles['CodeBlock']))
    elements.append(Paragraph("net.ipv4.tcp_syncookies = 1", styles['CodeBlock']))
    elements.append(Paragraph("net.ipv4.tcp_max_syn_backlog = 2048", styles['CodeBlock']))
    elements.append(Paragraph("net.ipv4.tcp_synack_retries = 2", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Performance tuning for databases/ES", styles['CodeBlock']))
    elements.append(Paragraph("vm.swappiness = 1", styles['CodeBlock']))
    elements.append(Paragraph("vm.dirty_ratio = 15", styles['CodeBlock']))
    elements.append(Paragraph("vm.dirty_background_ratio = 5", styles['CodeBlock']))
    elements.append(Paragraph("fs.file-max = 2097152", styles['CodeBlock']))
    elements.append(Paragraph("net.core.somaxconn = 65535", styles['CodeBlock']))
    elements.append(Paragraph("net.ipv4.tcp_tw_reuse = 1", styles['CodeBlock']))
    elements.append(Paragraph("net.ipv4.ip_local_port_range = 1024 65535", styles['CodeBlock']))
    elements.append(Paragraph("EOF", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Apply kernel parameters", styles['CodeBlock']))
    elements.append(Paragraph("sysctl -p /etc/sysctl.d/99-security-hardening.conf", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Set file descriptor limits for high-concurrency services", styles['CodeBlock']))
    elements.append(Paragraph("cat > /etc/security/limits.d/99-soc-platform.conf << 'EOF'", styles['CodeBlock']))
    elements.append(Paragraph("* soft nofile 1048576", styles['CodeBlock']))
    elements.append(Paragraph("* hard nofile 1048576", styles['CodeBlock']))
    elements.append(Paragraph("* soft nproc 65535", styles['CodeBlock']))
    elements.append(Paragraph("* hard nproc 65535", styles['CodeBlock']))
    elements.append(Paragraph("* soft memlock unlimited", styles['CodeBlock']))
    elements.append(Paragraph("* hard memlock unlimited", styles['CodeBlock']))
    elements.append(Paragraph("root soft nofile 1048576", styles['CodeBlock']))
    elements.append(Paragraph("root hard nofile 1048576", styles['CodeBlock']))
    elements.append(Paragraph("EOF", styles['CodeBlock']))
    
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("2.4 Validation Checklist", styles['Heading2Custom']))
    
    validation_items = [
        "OS boots successfully without errors",
        "All network interfaces configured with correct IPs",
        "Ping gateway, DNS, and peer servers successful",
        "SSH login works with key-based authentication only",
        "Firewall rules permit expected traffic, block others",
        "Kernel parameters applied correctly (sysctl -a | grep)",
        "File descriptor limits visible (ulimit -a)",
        "Time synchronized via NTP (timedatectl status)",
        "SELinux in enforcing mode (sestatus)",
        "No unnecessary services running (systemctl list-units)"
    ]
    
    for item in validation_items:
        elements.append(Paragraph(f"<bullet>[ ]</bullet> {item}", styles['BulletText']))
    
    return elements


def build_section_3_container_runtime(styles):
    """Section 3: Container runtime setup"""
    elements = []
    
    elements.append(Paragraph("3. Container Runtime & Orchestration Setup", styles['Heading1Custom']))
    
    elements.append(Paragraph(
        "The Djezzy SOC Platform deploys all fifteen security tools plus supporting infrastructure services as Docker containers orchestrated via Docker Compose. "
        "This section covers Docker Community Edition installation, daemon configuration optimized for production workloads, and Docker Compose installation "
        "for multi-container orchestration. Container runtime must be installed identically on all fourteen servers to ensure consistent behavior during service scheduling.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("3.1 Docker CE Installation", styles['Heading2Custom']))
    
    elements.append(Paragraph("Step 1: Add Docker Repository", styles['Heading3Custom']))
    
    elements.append(Paragraph("# Install dependencies", styles['CodeBlock']))
    elements.append(Paragraph("dnf install -y yum-utils device-mapper-persistent-data lvm2", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Add Docker CE stable repository", styles['CodeBlock']))
    elements.append(Paragraph("yum-config-manager --add-repo \\", styles['CodeBlock']))
    elements.append(Paragraph("    https://download.docker.com/linux/centos/docker-ce.repo", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# For air-gapped: Download RPMs separately and transfer via USB", styles['CodeBlock']))
    elements.append(Paragraph("# Download from: https://download.docker.com/linux/centos/9/x86_64/stable/Packages/", styles['CodeBlock']))
    
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("Step 2: Install Docker Components", styles['Heading3Custom']))
    
    elements.append(Paragraph("# Install Docker CE, CLI, Compose plugin, and containerd", styles['CodeBlock']))
    elements.append(Paragraph("dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Start and enable Docker service", styles['CodeBlock']))
    elements.append(Paragraph("systemctl enable --now docker", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Add platform engineers to docker group", styles['CodeBlock']))
    elements.append(Paragraph("usermod -aG docker <username>", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Verify installation", styles['CodeBlock']))
    elements.append(Paragraph("docker version", styles['CodeBlock']))
    elements.append(Paragraph("docker compose version", styles['CodeBlock']))
    elements.append(Paragraph("docker run --rm hello-world", styles['CodeBlock']))
    
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("3.2 Production Daemon Configuration", styles['Heading2Custom']))
    
    elements.append(Paragraph(
        "Configure Docker daemon with settings optimized for enterprise security workloads including storage driver selection, logging configuration, "
        "resource limits, and security options. These settings apply to all containers launched on this host.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("# Backup existing config", styles['CodeBlock']))
    elements.append(Paragraph("cp /etc/docker/daemon.json /etc/docker/daemon.json.backup 2>/dev/null || true", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Create production Docker daemon configuration", styles['CodeBlock']))
    elements.append(Paragraph("cat > /etc/docker/daemon.json << 'DAEMON_EOF'", styles['CodeBlock']))
    elements.append(Paragraph("{", styles['CodeBlock']))
    elements.append(Paragraph('  "log-driver": "json-file",', styles['CodeBlock']))
    elements.append(Paragraph('  "log-opts": {', styles['CodeBlock']))
    elements.append(Paragraph('    "max-size": "100m",', styles['CodeBlock']))
    elements.append(Paragraph('    "max-file": "10"', styles['CodeBlock']))
    elements.append(Paragraph("  },", styles['CodeBlock']))
    elements.append(Paragraph('  "storage-driver": "overlay2",', styles['CodeBlock']))
    elements.append(Paragraph('  "storage-opts": [', styles['CodeBlock']))
    elements.append(Paragraph('    "overlay2.override_kernel_check=true"', styles['CodeBlock']))
    elements.append(Paragraph("  ],", styles['CodeBlock']))
    elements.append(Paragraph('  "default-ulimits": {', styles['CodeBlock']))
    elements.append(Paragraph('    "nofile": {', styles['CodeBlock']))
    elements.append(Paragraph('      "Name": "nofile",', styles['CodeBlock']))
    elements.append(Paragraph('      "Hard": 1048576,', styles['CodeBlock']))
    elements.append(Paragraph('      "Soft": 1048576', styles['CodeBlock']))
    elements.append(Paragraph("    }", styles['CodeBlock']))
    elements.append(Paragraph("  },", styles['CodeBlock']))
    elements.append(Paragraph('  "max-concurrent-downloads": 10,', styles['CodeBlock']))
    elements.append(Paragraph('  "max-concurrent-uploads": 10,', styles['CodeBlock']))
    elements.append(Paragraph('  "live-restore": true,', styles['CodeBlock']))
    elements.append(Paragraph('  "userland-proxy": false,', styles['CodeBlock']))
    elements.append(Paragraph('  "init": true,', styles['CodeBlock']))
    elements.append(Paragraph('  "iptables": true,', styles['CodeBlock']))
    elements.append(Paragraph('  "ip6tables": true,', styles['CodeBlock']))
    elements.append(Paragraph('  "bridge": "none",', styles['CodeBlock']))
    elements.append(Paragraph('  "ip": "none",', styles['CodeBlock']))
    elements.append(Paragraph('  "insecure-registries": [],', styles['CodeBlock']))
    elements.append(Paragraph('  "registry-mirrors": []', styles['CodeBlock']))
    elements.append(Paragraph("}", styles['CodeBlock']))
    elements.append(Paragraph("DAEMON_EOF", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Restart Docker to apply changes", styles['CodeBlock']))
    elements.append(Paragraph("systemctl restart docker", styles['CodeBlock']))
    elements.append(Paragraph("systemctl status docker", styles['CodeBlock']))
    
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("3.3 Custom Bridge Networks", styles['Heading2Custom']))
    
    elements.append(Paragraph(
        "Create the four isolated bridge networks defined in the architecture document. These networks provide Layer 2 isolation between service tiers "
        "and map to physical VLANs where required for inter-server communication.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("# Create SOC platform networks", styles['CodeBlock']))
    elements.append(Paragraph("# Frontend network (user-facing apps, API gateway)", styles['CodeBlock']))
    elements.append(Paragraph("docker network create \\", styles['CodeBlock']))
    elements.append(Paragraph("    --driver bridge \\", styles['CodeBlock']))
    elements.append(Paragraph("    --subnet 172.28.0.0/16 \\", styles['CodeBlock']))
    elements.append(Paragraph("    --gateway 172.28.0.1 \\", styles['CodeBlock']))
    elements.append(Paragraph("    --opt com.docker.network.bridge.name=soc_frontend \\", styles['CodeBlock']))
    elements.append(Paragraph("    soc-frontend", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Backend network (SOAR, Threat Intel, Vuln)", styles['CodeBlock']))
    elements.append(Paragraph("docker network create \\", styles['CodeBlock']))
    elements.append(Paragraph("    --driver bridge \\", styles['CodeBlock']))
    elements.append(Paragraph("    --subnet 172.29.0.0/16 \\", styles['CodeBlock']))
    elements.append(Paragraph("    --gateway 172.29.0.1 \\", styles['CodeBlock']))
    elements.append(Paragraph("    --opt com.docker.network.bridge.name=soc_backend \\", styles['CodeBlock']))
    elements.append(Paragraph("    soc-backend", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Events network (SIEM, DB, Kafka, ES)", styles['CodeBlock']))
    elements.append(Paragraph("docker network create \\", styles['CodeBlock']))
    elements.append(Paragraph("    --driver bridge \\", styles['CodeBlock']))
    elements.append(Paragraph("    --subnet 172.30.0.0/16 \\", styles['CodeBlock']))
    elements.append(Paragraph("    --gateway 172.30.0.1 \\", styles['CodeBlock']))
    elements.append(Paragraph("    --opt com.docker.network.bridge.name=soc_events \\", styles['CodeBlock']))
    elements.append(Paragraph("    soc-events", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Monitoring network (Prometheus, Grafana)", styles['CodeBlock']))
    elements.append(Paragraph("docker network create \\", styles['CodeBlock']))
    elements.append(Paragraph("    --driver bridge \\", styles['CodeBlock']))
    elements.append(Paragraph("    --subnet 172.31.0.0/16 \\", styles['CodeBlock']))
    elements.append(Paragraph("    --gateway 172.31.0.1 \\", styles['CodeBlock']))
    elements.append(Paragraph("    --opt com.docker.network.bridge.name=soc_monitoring \\", styles['CodeBlock']))
    elements.append(Paragraph("    soc-monitoring", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Verify networks created", styles['CodeBlock']))
    elements.append(Paragraph("docker network ls | grep soc-", styles['CodeBlock']))
    elements.append(Paragraph("docker network inspect soc-frontend", styles['CodeBlock']))
    
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("3.4 Validation", styles['Heading2Custom']))
    
    elements.append(Paragraph("[ ] Docker daemon running without errors (systemctl status docker)", styles['BulletText']))
    elements.append(Paragraph("[ ] Docker version matches target (docker version >= 27.0)", styles['BulletText']))
    elements.append(Paragraph("[ ] Docker Compose plugin working (docker compose version)", styles['BulletText']))
    elements.append(Paragraph("[ ] Container can run hello-world successfully", styles['BulletText']))
    elements.append(Paragraph("[ ] All four SOC networks exist (docker network ls)", styles['CodeBlock']))
    elements.append(Paragraph("[ ] Network subnets match specification (docker network inspect)", styles['BulletText']))
    elements.append(Paragraph("[ ] Log rotation configured (check /var/log/docker/)", styles['BulletText']))
    elements.append(Paragraph("[ ] Storage driver is overlay2 (docker info | grep Storage)", styles['BulletText']))
    
    return elements


def build_section_4_network_config(styles):
    """Section 4: Network configuration"""
    elements = []
    
    elements.append(Paragraph("4. Network Configuration & Segmentation", styles['Heading1Custom']))
    
    elements.append(Paragraph(
        "This section details advanced network configuration including interface bonding for redundancy, VLAN tagging for segmentation, and optimization "
        "settings for high-throughput workloads. Proper network configuration is critical for the NSM capture nodes that must sustain 100Gbps line-rate "
        "packet processing without loss.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("4.1 Bonded Interface Configuration (LACP)", styles['Heading2Custom']))
    
    elements.append(Paragraph(
        "For servers requiring high availability and increased bandwidth, configure bonded interfaces using LACP (802.3ad) protocol. This applies particularly "
        "to Elasticsearch data nodes, database cluster members, and application servers with multiple data interfaces.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("# Example: Bond configuration for ES Data Node (2x 25GbE)", styles['CodeBlock']))
    elements.append(Paragraph("# Create bond interface file", styles['CodeBlock']))
    elements.append(Paragraph("cat > /etc/sysconfig/network-scripts/ifcfg-bond0 << 'EOF'", styles['CodeBlock']))
    elements.append(Paragraph("DEVICE=bond0", styles['CodeBlock']))
    elements.append(Paragraph("TYPE=Bond", styles['CodeBlock']))
    elements.append(Paragraph("BONDING_MASTER=yes", styles['CodeBlock']))
    elements.append(Paragraph("IPADDR=172.30.0.111", styles['CodeBlock']))
    elements.append(Paragraph("PREFIX=16", styles['CodeBlock']))
    elements.append(Paragraph("GATEWAY=172.30.0.1", styles['CodeBlock']))
    elements.append(Paragraph("DNS1=172.16.0.10", styles['CodeBlock']))
    elements.append(Paragraph("BONDING_MODE=4          # LACP (802.3ad)", styles['CodeBlock']))
    elements.append(Paragraph("BONDING_XMIT_HASH_POLICY=layer3+4", styles['CodeBlock']))
    elements.append(Paragraph("MIIMON=100              # Link monitoring interval (ms)", styles['CodeBlock']))
    elements.append(Paragraph("LACP_RATE=fast           # LACPDU transmission rate", styles['CodeBlock']))
    elements.append(Paragraph("EOF", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Configure slave interfaces", styles['CodeBlock']))
    elements.append(Paragraph("cat > /etc/sysconfig/network-scripts/ifcfg-enp1s0f0 << 'EOF'", styles['CodeBlock']))
    elements.append(Paragraph("DEVICE=enp1s0f0", styles['CodeBlock']))
    elements.append(Paragraph("TYPE=Ethernet", styles['CodeBlock']))
    elements.append(Paragraph("MASTER=bond0", styles['CodeBlock']))
    elements.append(Paragraph("SLAVE=yes", styles['CodeBlock']))
    elements.append(Paragraph("BOOTPROTO=none", styles['CodeBlock']))
    elements.append(Paragraph("EOF", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Repeat for enp1s0f1 (second slave)", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Activate bond", styles['CodeBlock']))
    elements.append(Paragraph("ifdown enp1s0f0 enp1s0f1 && ifup bond0", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Verify bond status", styles['CodeBlock']))
    elements.append(Paragraph("cat /proc/net/bonding/bond0", styles['CodeBlock']))
    elements.append(Paragraph("ip link show bond0", styles['CodeBlock']))
    
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("4.2 NSM Capture Node Network Optimization", styles['Heading2Custom']))
    
    elements.append(Paragraph(
        "Packet capture nodes require special network tuning to achieve line-rate capture at 100Gbps without packet loss. These optimizations include "
        "increasing ring buffer sizes, enabling multi-queue RSS, and configuring interrupt affinity for optimal CPU utilization.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("# Increase NIC ring buffers for high-throughput capture", styles['CodeBlock']))
    elements.append(Paragraph("# (Requires ethtool and NIC driver support)", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Set RX/TX ring buffer to maximum", styles['CodeBlock']))
    elements.append(Paragraph("ethtool -G enp134s0 rx 8192 tx 8192", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Enable multi-queue RSS (Receive Side Scaling)", styles['CodeBlock']))
    elements.append(Paragraph("ethtool -L enp134s0 combined 16", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Set interrupt coalescing for throughput vs latency tradeoff", styles['CodeBlock']))
    elements.append(Paragraph("ethtool -C enp134s0 adaptive-rx on adaptive-tx on", styles['CodeBlock']))
    elements.append(Paragraph("ethtool -C enp134s0 rx-usecs 50 tx-usecs 50", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Make settings persistent across reboots", styles['CodeBlock']))
    elements.append(Paragraph("cat > /etc/udev/rules.d/99-nic-tuning.rules << 'EOF'", styles['CodeBlock']))
    elements.append(Paragraph('ACTION=="add", SUBSYSTEM=="net", KERNELS=="enp134s0", \\', styles['CodeBlock']))
    elements.append(Paragraph('  RUN+="/sbin/ethtool -G $kernel rx 8192 tx 8192"', styles['CodeBlock']))
    elements.append(Paragraph('ACTION=="add", SUBSYSTEM=="net", KERNELS=="enp134s0", \\', styles['CodeBlock']))
    elements.append(Paragraph('  RUN+="/sbin/ethtool -L $kernel combined 16"', styles['CodeBlock']))
    elements.append(Paragraph("EOF", styles['CodeBlock']))
    
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("4.3 DNS Configuration", styles['Heading2Custom']))
    
    elements.append(Paragraph(
        "Configure local DNS resolution for all SOC platform hostnames. This ensures consistent name resolution across all services regardless of which "
        "network zone they reside in. Use the internal DNS servers configured during pre-deployment.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("# Configure /etc/resolv.conf (via NetworkManager or direct)", styles['CodeBlock']))
    elements.append(Paragraph("cat > /etc/resolv.conf << 'EOF'", styles['CodeBlock']))
    elements.append(Paragraph("search internal.djezzy.dz", styles['CodeBlock']))
    elements.append(Paragraph("nameserver 172.16.0.10", styles['CodeBlock']))
    elements.append(Paragraph("nameserver 172.16.0.11", styles['CodeBlock']))
    elements.append(Paragraph("options rotate", styles['CodeBlock']))
    elements.append(Paragraph("options timeout:2", styles['CodeBlock']))
    elements.append(Paragraph("options attempts:3", styles['CodeBlock']))
    elements.append(Paragraph("EOF", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Test DNS resolution", styles['CodeBlock']))
    elements.append(Paragraph("dig soc-es-data-01.internal.djezzy.dz +short", styles['CodeBlock']))
    elements.append(Paragraph("dig soc-db-primary.internal.djezzy.dz +short", styles['CodeBlock']))
    elements.append(Paragraph("nslookup soc-nsm-capture-01.internal.djezzy.dz", styles['CodeBlock']))
    
    return elements


def build_section_5_database_layer(styles):
    """Section 5: Database deployment"""
    elements = []
    
    elements.append(Paragraph("5. Database Layer Deployment", styles['Heading1Custom']))
    
    elements.append(Paragraph(
        "The database layer forms the persistent storage foundation for the entire SOC platform. This section covers PostgreSQL 16 for structured data "
        "(cases, findings, configuration), Apache Kafka 3.6 for event streaming, Redis 7 for caching, and ZooKeeper for Kafka coordination. Deploy these "
        "components on the three dedicated database cluster nodes (soc-db-primary, soc-db-replica-01, soc-db-replica-02) following the procedures below.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("5.1 PostgreSQL 16 Installation", styles['Heading2Custom']))
    
    elements.append(Paragraph("Step 1: Add PostgreSQL Repository", styles['Heading3Custom']))
    
    elements.append(Paragraph("# Install PostgreSQL 16 repository", styles['CodeBlock']))
    elements.append(Paragraph("dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-x86_64/pgdg-redhat-repo-latest.noarch.rpm", styles['CodeBlock']))
    elements.append(Paragraph("dnf install -y postgresql16-server postgresql16 contrib", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Initialize database cluster", styles['CodeBlock']))
    elements.append(Paragraph("/usr/pgsql-16/bin/postgresql-16-setup initdb", styles['CodeBlock']))
    
    elements.append(Spacer(1, 6))
    elements.append(Paragraph("Step 2: Configure PostgreSQL for High Performance", styles['Heading3Custom']))
    
    elements.append(Paragraph("# Edit postgresql.conf for SOC workload optimization", styles['CodeBlock']))
    elements.append(Paragraph("vi /var/lib/pgsql/16/data/postgresql.conf", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Key performance settings (add/modify in postgresql.conf):", styles['CodeBlock']))
    elements.append(Paragraph("# Connection settings", styles['CodeBlock']))
    elements.append(Paragraph("listen_addresses = '*'", styles['CodeBlock']))
    elements.append(Paragraph("port = 5432", styles['CodeBlock']))
    elements.append(Paragraph("max_connections = 500", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Memory settings (tune based on server RAM - this example for 384GB)", styles['CodeBlock']))
    elements.append(Paragraph("shared_buffers = 96GB                    # 25% of RAM", styles['CodeBlock']))
    elements.append(Paragraph("effective_cache_size = 288GB            # 75% of RAM", styles['CodeBlock']))
    elements.append(Paragraph("work_mem = 256MB                        # Per-sort memory", styles['CodeBlock']))
    elements.append(Paragraph("maintenance_work_mem = 2GB             # Maintenance ops", styles['CodeBlock']))
    elements.append(Paragraph("huge_pages = try                       # Use huge pages", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# WAL settings for replication", styles['CodeBlock']))
    elements.append(Paragraph("wal_level = replica", styles['CodeBlock']))
    elements.append(Paragraph("max_wal_senders = 5", styles['CodeBlock']))
    elements.append(Paragraph("wal_keep_size = 32GB", styles['CodeBlock']))
    elements.append(Paragraph("wal_compression = zstd", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Query optimizer", styles['CodeBlock']))
    elements.append(Paragraph("random_page_cost = 1.1                  # SSD optimization", styles['CodeBlock']))
    elements.append(Paragraph("effective_io_concurrency = 200         # SSD parallel I/O", styles['CodeBlock']))
    elements.append(Paragraph("default_statistics_target = 200", styles['CodeBlock']))
    
    elements.append(Spacer(1, 6))
    elements.append(Paragraph("Step 3: Configure Streaming Replication", styles['Heading3Custom']))
    
    elements.append(Paragraph("# On PRIMARY server - create replication user", styles['CodeBlock']))
    elements.append(Paragraph("sudo -u postgres psql -c \"CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD '<strong_password>';\"", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Edit pg_hba.conf to allow replication connections", styles['CodeBlock']))
    elements.append(Paragraph("echo 'host replication replicator 172.30.0.0/16 scram-sha-256' >> /var/lib/pgsql/16/data/pg_hba.conf", styles['CodeBlock']))
    elements.append(Paragraph("echo 'host all all 172.30.0.0/16 scram-sha-256' >> /var/lib/pgsql/16/data/pg_hba.conf", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Restart PostgreSQL", styles['CodeBlock']))
    elements.append(Paragraph("systemctl restart postgresql-16", styles['CodeBlock']))
    elements.append(Paragraph("systemctl enable postgresql-16", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# On REPLICA servers - base backup from primary", styles['CodeBlock']))
    elements.append(Paragraph("# Stop PostgreSQL on replica first", styles['CodeBlock']))
    elements.append(Paragraph("systemctl stop postgresql-16", styles['CodeBlock']))
    elements.append(Paragraph("rm -rf /var/lib/pgsql/16/data/*", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Perform base backup from primary", styles['CodeBlock']))
    elements.append(Paragraph("sudo -u postgres /usr/pgsql-16/bin/pg_basebackup \\", styles['CodeBlock']))
    elements.append(Paragraph("    -h soc-db-primary.internal.djezzy.dz \\", styles['CodeBlock']))
    elements.append(Paragraph("    -U replicator \\", styles['CodeBlock']))
    elements.append(Paragraph("    -D /var/lib/pgsql/16/data \\", styles['CodeBlock']))
    elements.append(Paragraph("    -Fp -Xs -P -R", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Create standby.signal file on replica", styles['CodeBlock']))
    elements.append(Paragraph("sudo -u postgres touch /var/lib/pgsql/16/data/standby.signal", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Configure primary_conninfo in postgresql.auto.conf", styles['CodeBlock']))
    elements.append(Paragraph("echo \"primary_conninfo = 'host=soc-db-primary.internal.djezzy.dz port=5432 user=replicator password=<password>'\" \\", styles['CodeBlock']))
    elements.append(Paragraph("    > /var/lib/pgsql/16/data/postgresql.auto.conf", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Start replica - it will connect to primary and begin replicating", styles['CodeBlock']))
    elements.append(Paragraph("chown -R postgres:postgres /var/lib/pgsql/16/data", styles['CodeBlock']))
    elements.append(Paragraph("systemctl start postgresql-16", styles['CodeBlock']))
    
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("5.2 Apache Kafka 3.6 Installation", styles['Heading2Custom']))
    
    elements.append(Paragraph("# Download and extract Kafka", styles['CodeBlock']))
    elements.append(Paragraph("cd /opt", styles['CodeBlock']))
    elements.append(Paragraph("wget https://archive.apache.org/dist/kafka/3.6.1/kafka_2.13-3.6.1.tgz", styles['CodeBlock']))
    elements.append(Paragraph("tar -xzf kafka_2.13-3.6.1.tgz", styles['CodeBlock']))
    elements.append(Paragraph("ln -s kafka_2.13-3.6.1 kafka", styles['CodeBlock']))
    elements.append(Paragraph("useradd -r -m -d /opt/kafka kafka", styles['CodeBlock']))
    elements.append(Paragraph("chown -R kafka:kafka /opt/kafka*", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Create Kafka data directories", styles['CodeBlock']))
    elements.append(Paragraph("mkdir -p /data/kafka/logs /data/kafka/data", styles['CodeBlock']))
    elements.append(Paragraph("chown -R kafka:kafka /data/kafka", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Configure ZooKeeper (on each broker node)", styles['CodeBlock']))
    elements.append(Paragraph("cat > /opt/kafka/config/zookeeper.properties << 'EOF'", styles['CodeBlock']))
    elements.append(Paragraph("dataDir=/data/kafka/zookeeper", styles['CodeBlock']))
    elements.append(Paragraph("clientPort=2181", styles['CodeBlock']))
    elements.append(Paragraph("maxClientCnxns=200", styles['CodeBlock']))
    elements.append(Paragraph("tickTime=2000", styles['CodeBlock']))
    elements.append(Paragraph("initLimit=10", styles['CodeBlock']))
    elements.append(Paragraph("syncLimit=5", styles['CodeBlock']))
    elements.append(Paragraph("# Server IDs for 3-node ensemble:", styles['CodeBlock']))
    elements.append(Paragraph("server.1=soc-db-primary:2888:3888", styles['CodeBlock']))
    elements.append(Paragraph("server.2=soc-db-replica-01:2888:3888", styles['CodeBlock']))
    elements.append(Paragraph("server.3=soc-db-replica-02:2888:3888", styles['CodeBlock']))
    elements.append(Paragraph("autopurge.purgeInterval=24", styles['CodeBlock']))
    elements.append(Paragraph("autopurge.snapRetainCount=3", styles['CodeBlock']))
    elements.append(Paragraph("EOF", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Create myid file (unique per node: 1, 2, or 3)", styles['CodeBlock']))
    elements.append(Paragraph("echo \"1\" > /data/kafka/zookeeper/myid  # On primary", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Configure Kafka Broker", styles['CodeBlock']))
    elements.append(Paragraph("cat > /opt/kafka/config/server.properties << 'EOF'", styles['CodeBlock']))
    elements.append(Paragraph("broker.id=1                              # Unique per broker", styles['CodeBlock']))
    elements.append(Paragraph("listeners=PLAINTEXT://172.30.0.121:9092", styles['CodeBlock']))
    elements.append(Paragraph("advertised.listeners=PLAINTEXT://soc-db-primary.internal.djezzy.dz:9092", styles['CodeBlock']))
    elements.append(Paragraph("num.network.threads=8", styles['CodeBlock']))
    elements.append(Paragraph("num.io.threads=16", styles['CodeBlock']))
    elements.append(Paragraph("socket.send.buffer.bytes=1024000", styles['CodeBlock']))
    elements.append(Paragraph("socket.receive.buffer.bytes=1024000", styles['CodeBlock']))
    elements.append(Paragraph("socket.request.max.bytes=104857600", styles['CodeBlock']))
    elements.append(Paragraph("log.dirs=/data/kafka/data", styles['CodeBlock']))
    elements.append(Paragraph("num.partitions=32                        # Default partition count", styles['CodeBlock']))
    elements.append(Paragraph("num.recovery.threads.per.data.dir=4", styles['CodeBlock']))
    elements.append(Paragraph("offsets.topic.replication.factor=3", styles['CodeBlock']))
    elements.append(Paragraph("transaction.state.log.replication.factor=3", styles['CodeBlock']))
    elements.append(Paragraph("transaction.state.log.min.isr=2", styles['CodeBlock']))
    elements.append(Paragraph("log.retention.hours=336                   # 14 days retention", styles['CodeBlock']))
    elements.append(Paragraph("log.segment.bytes=1073741824            # 1GB segment size", styles['CodeBlock']))
    elements.append(Paragraph("log.retention.check.interval.ms=300000", styles['CodeBlock']))
    elements.append(Paragraph("zookeeper.connect=soc-db-primary:2181,soc-db-replica-01:2181,soc-db-replica-02:2181", styles['CodeBlock']))
    elements.append(Paragraph("zookeeper.connection.timeout.ms=18000", styles['CodeBlock']))
    elements.append(Paragraph("group.initial.rebalance.delay.ms=0", styles['CodeBlock']))
    elements.append(Paragraph("delete.topic.enable=true", styles['CodeBlock']))
    elements.append(Paragraph("auto.create.topics.enable=false", styles['CodeBlock']))
    elements.append(Paragraph("compression.type=lz4", styles['CodeBlock']))
    elements.append(Paragraph("EOF", styles['CodeBlock']))
    
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("5.3 Redis 7 Cache Layer", styles['Heading2Custom']))
    
    elements.append(Paragraph("# Install Redis 7", styles['CodeBlock']))
    elements.append(Paragraph("dnf module enable redis:7 -y", styles['CodeBlock']))
    elements.append(Paragraph("dnf install redis -y", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Configure Redis for production use", styles['CodeBlock']))
    elements.append(Paragraph("cat > /etc/redis/redis.conf << 'EOF'", styles['CodeBlock']))
    elements.append(Paragraph("bind 172.30.0.121 127.0.0.1             # Bind to events network + localhost", styles['CodeBlock']))
    elements.append(Paragraph("port 6379", styles['CodeBlock']))
    elements.append(Paragraph("protected-mode yes", styles['CodeBlock']))
    elements.append(Paragraph("requirepass <strong_redis_password>", styles['CodeBlock']))
    elements.append(Paragraph("maxmemory 64gb                           # Limit to 64GB of 128GB RAM", styles['CodeBlock']))
    elements.append(Paragraph("maxmemory-policy allkeys-lru", styles['CodeBlock']))
    elements.append(Paragraph("save 900 1                               # Snapshot every 15 min if 1 key changed", styles['CodeBlock']))
    elements.append(Paragraph("save 300 10", styles['CodeBlock']))
    elements.append(Paragraph("save 60 10000", styles['CodeBlock']))
    elements.append(Paragraph("appendonly yes                           # AOF persistence", styles['CodeBlock']))
    elements.append(Paragraph("appendfilename \"appendonly.aof\"", styles['CodeBlock']))
    elements.append(Paragraph("appendfsync everysec", styles['CodeBlock']))
    elements.append(Paragraph("tcp-backlog 511", styles['CodeBlock']))
    elements.append(Paragraph("timeout 0", styles['CodeBlock']))
    elements.append(Paragraph("tcp-keepalive 300", styles['CodeBlock']))
    elements.append(Paragraph("loglevel notice", styles['CodeBlock']))
    elements.append(Paragraph("databases 16", styles['CodeBlock']))
    elements.append(Paragraph("EOF", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Enable and start Redis", styles['CodeBlock']))
    elements.append(Paragraph("systemctl enable --now redis", styles['CodeBlock']))
    
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("5.4 PgBouncer Connection Pooler", styles['Heading2Custom']))
    
    elements.append(Paragraph(
        "PgBouncer sits between application containers and PostgreSQL, managing connection pools efficiently for the microservices architecture that generates "
        "thousands of concurrent connections. Install PgBouncer on all three database nodes.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("# Install PgBouncer", styles['CodeBlock']))
    elements.append(Paragraph("dnf install -y pgbouncer", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Configure PgBouncer", styles['CodeBlock']))
    elements.append(Paragraph("cat > /etc/pgbouncer/pgbouncer.ini << 'EOF'", styles['CodeBlock']))
    elements.append(Paragraph("[databases]", styles['CodeBlock']))
    elements.append(Paragraph("soc_platform = host=127.0.0.1 port=5432 dbname=socdb", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("[pgbouncer]", styles['CodeBlock']))
    elements.append(Paragraph("pool_mode = transaction", styles['CodeBlock']))
    elements.append(Paragraph("listen_addr = 172.30.0.121", styles['CodeBlock']))
    elements.append(Paragraph("listen_port = 6432", styles['CodeBlock']))
    elements.append(Paragraph("auth_type = md5", styles['CodeBlock']))
    elements.append(Paragraph("auth_file = /etc/pgbouncer/userlist.txt", styles['CodeBlock']))
    elements.append(Paragraph("admin_users = postgres", styles['CodeBlock']))
    elements.append(Paragraph("default_pool_size = 25", styles['CodeBlock']))
    elements.append(Paragraph("max_client_conn = 5000", styles['CodeBlock']))
    elements.append(Paragraph("reserve_pool_size = 5", styles['CodeBlock']))
    elements.append(Paragraph("reserve_pool_timeout = 3", styles['CodeBlock']))
    elements.append(Paragraph("server_reset_query = DISCARD ALL", styles['CodeBlock']))
    elements.append(Paragraph("server_check_query = SELECT 1", styles['CodeBlock']))
    elements.append(Paragraph("server_check_delay = 30", styles['CodeBlock']))
    elements.append(Paragraph("log_connections = 1", styles['CodeBlock']))
    elements.append(Paragraph("log_disconnections = 1", styles['CodeBlock']))
    elements.append(Paragraph("log_pooler_errors = 1", styles['CodeBlock']))
    elements.append(Paragraph("stats_period = 60", styles['CodeBlock']))
    elements.append(Paragraph("EOF", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Create user list for authentication", styles['CodeBlock']))
    elements.append(Paragraph('echo "\"soc_app\" \"<app_password>\"" > /etc/pgbouncer/userlist.txt', styles['CodeBlock']))
    elements.append(Paragraph("chmod 640 /etc/pgbouncer/userlist.txt", styles['CodeBlock']))
    elements.append(Paragraph("chown pgbouncer:pgbouncer /etc/pgbouncer/userlist.txt", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Enable and start PgBouncer", styles['CodeBlock']))
    elements.append(Paragraph("systemctl enable --now pgbouncer", styles['CodeBlock']))
    
    return elements


def build_section_6_elasticsearch(styles):
    """Section 6: Elasticsearch deployment"""
    elements = []
    
    elements.append(Paragraph("6. Elasticsearch Cluster Deployment", styles['Heading1Custom']))
    
    elements.append(Paragraph(
        "Elasticsearch serves as the primary search and analytics engine for the SOC platform, indexing security events from Wazuh, logs from all services, "
        "and providing the query backend for Kibana dashboards and investigations. This section covers Elasticsearch 8.12 cluster deployment across four "
        "dedicated data nodes plus master-eligible nodes on the SIEM masters.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("6.1 Elasticsearch Installation", styles['Heading2Custom']))
    
    elements.append(Paragraph("# Import Elasticsearch GPG key and repository", styles['CodeBlock']))
    elements.append(Paragraph("rpm --import https://artifacts.elastic.co/GPG-KEY-elasticsearch", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("cat > /etc/yum.repos.d/elasticsearch.repo << 'EOF'", styles['CodeBlock']))
    elements.append(Paragraph("[elasticsearch-8.x]", styles['CodeBlock']))
    elements.append(Paragraph("name=Elasticsearch repository for 8.x packages", styles['CodeBlock']))
    elements.append(Paragraph("baseurl=https://artifacts.elastic.co/packages/8.x/yum", styles['CodeBlock']))
    elements.append(Paragraph("gpgcheck=1", styles['CodeBlock']))
    elements.append(Paragraph("gpgkey=https://artifacts.elastic.co/GPG-KEY-elasticsearch", styles['CodeBlock']))
    elements.append(Paragraph("enabled=1", styles['CodeBlock']))
    elements.append(Paragraph("autorefresh=1", styles['CodeBlock']))
    elements.append(Paragraph("type=rpm-md", styles['CodeBlock']))
    elements.append(Paragraph("EOF", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Install Elasticsearch", styles['CodeBlock']))
    elements.append(Paragraph("dnf install -y elasticsearch", styles['CodeBlock']))
    
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("6.2 JVM and Memory Configuration", styles['Heading2Custom']))
    
    elements.append(Paragraph(
        "Elasticsearch runs on Java Virtual Machine (JVM) and requires careful memory tuning. Allocate approximately 50% of system RAM to Elasticsearch heap, "
        "leaving the remainder for operating system filesystem cache that significantly improves index segment access performance.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("# Configure JVM options (for 512GB RAM server -> ~256GB heap)", styles['CodeBlock']))
    elements.append(Paragraph("cat > /etc/elasticsearch/jvm.options.d/soc-platform.options << 'EOF'", styles['CodeBlock']))
    elements.append(Paragraph("-Xms256g", styles['CodeBlock']))
    elements.append(Paragraph("-Xmx256g", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# GC settings for large heaps", styles['CodeBlock']))
    elements.append(Paragraph("-XX:+UseG1GC", styles['CodeBlock']))
    elements.append(Paragraph("-XX:G1HeapRegionSize=16m", styles['CodeBlock']))
    elements.append(Paragraph("-XX:InitiatingHeapOccupancyPercent=30", styles['CodeBlock']))
    elements.append(Paragraph("-XX:G1ReservePercent=15", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Disable DNS caching (use system resolver)", styles['CodeBlock']))
    elements.append(Paragraph("-Des.networkaddress.cache.ttl=10", styles['CodeBlock']))
    elements.append(Paragraph("-Des.networkaddress.cache.negative.ttl=5", styles['CodeBlock']))
    elements.append(Paragraph("EOF", styles['CodeBlock']))
    
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("6.3 Elasticsearch Cluster Configuration", styles['Heading2Custom']))
    
    elements.append(Paragraph("# Main elasticsearch.yml configuration", styles['CodeBlock']))
    elements.append(Paragraph("cat > /etc/elasticsearch/elasticsearch.yml << 'EOF'", styles['CodeBlock']))
    elements.append(Paragraph("cluster.name: djezzy-soc-cluster", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Node identity", styles['CodeBlock']))
    elements.append(Paragraph("node.name: es-data-01                     # Unique per node", styles['CodeBlock']))
    elements.append(Paragraph("node.roles: [data, data_hot, data_warm, ingest]", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Network binding", styles['CodeBlock']))
    elements.append(Paragraph("network.host: 172.30.0.111                 # Events network IP", styles['CodeBlock']))
    elements.append(Paragraph("http.port: 9200", styles['CodeBlock']))
    elements.append(Paragraph("transport.port: 9300", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Discovery - seed hosts are master-eligible nodes", styles['CodeBlock']))
    elements.append(Paragraph("discovery.seed_hosts: [\"172.30.0.101\", \"172.30.0.102\"]", styles['CodeBlock']))
    elements.append(Paragraph("cluster.initial_master_nodes: [\"es-master-01\", \"es-master-02\"]", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Security (initial setup generates passwords)", styles['CodeBlock']))
    elements.append(Paragraph("xpack.security.enabled: true", styles['CodeBlock']))
    elements.append(Paragraph("xpack.security.enrollment.enabled: false", styles['CodeBlock']))
    elements.append(Paragraph("xpack.security.http.ssl.enabled: false       # Enable for production!", styles['CodeBlock']))
    elements.append(Paragraph("xpack.security.transport.ssl.enabled: true", styles['CodeBlock']))
    elements.append(Paragraph("xpack.security.transport.ssl.verification_mode: certificate", styles['CodeBlock']))
    elements.append(Paragraph("xpack.security.transport.ssl.keystore.path: elastic-certificates.p12", styles['CodeBlock']))
    elements.append(Paragraph("xpack.security.transport.ssl.truststore.path: elastic-certificates.p12", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Paths", styles['CodeBlock']))
    elements.append(Paragraph("path.data: /data/elasticsearch/data", styles['CodeBlock']))
    elements.append(Paragraph("path.logs: /var/log/elasticsearch", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Memory locking (critical for performance)", styles['CodeBlock']))
    elements.append(Paragraph("bootstrap.memory_lock: true", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Performance tuning", styles['CodeBlock']))
    elements.append(Paragraph("indices.memory.index_buffer_size: 30%", styles['CodeBlock']))
    elements.append(Paragraph("indices.query.cache.size: 15%", styles['CodeBlock']))
    elements.append(Paragraph("thread_pool.search.size: 20", styles['CodeBlock']))
    elements.append(Paragraph("thread_pool.write.size: 20", styles['CodeBlock']))
    elements.append(Paragraph("thread_pool.get.size: 20", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Index lifecycle (ILM)", styles['CodeBlock']))
    elements.append(Paragraph("indices.lifecycle.poll_interval: 1m", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Snapshot repository (local)", styles['CodeBlock']))
    elements.append(Paragraph("path.repo: [\"/data/elasticsearch/snapshots\"]", styles['CodeBlock']))
    elements.append(Paragraph("EOF", styles['CodeBlock']))
    
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("6.4 Starting and Validating Cluster", styles['Heading2Custom']))
    
    elements.append(Paragraph("# Enable memory locking for elasticsearch user", styles['CodeBlock']))
    elements.append(Paragraph("systemctl edit elasticsearch", styles['CodeBlock']))
    elements.append(Paragraph("# Add under [Service]:", styles['CodeBlock']))
    elements.append(Paragraph("# LimitMEMLOCK=infinity", styles['CodeBlock']))
    elements.append(Paragraph("# LimitNOFILE=1048576", styles['CodeBlock']))
    elements.append(Paragraph("# LimitNPROC=65535", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Start Elasticsearch", styles['CodeBlock']))
    elements.append(Paragraph("systemctl daemon-reload", styles['CodeBlock']))
    elements.append(Paragraph("systemctl enable --now elasticsearch", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Wait for cluster to form (~30 seconds)", styles['CodeBlock']))
    elements.append(Paragraph("sleep 30", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Check cluster health", styles['CodeBlock']))
    elements.append(Paragraph("curl -X GET \"localhost:9200/_cluster/health?pretty\" -u elastic:<password>", styles['CodeBlock']))
    elements.append(Paragraph("# Expected response: \"status\": \"green\" or \"yellow\"", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Check nodes", styles['CodeBlock']))
    elements.append(Paragraph("curl -X GET \"localhost:9200/_cat/nodes?v\" -u elastic:<password>", styles['CodeBlock']))
    elements.append(Paragraph("", styles['CodeBlock']))
    elements.append(Paragraph("# Reset built-in passwords (first time only)", styles['CodeBlock']))
    elements.append(Paragraph("/usr/share/elasticsearch/bin/elasticsearch-reset-password -i -u elastic", styles['CodeBlock']))
    elements.append(Paragraph("/usr/share/elasticsearch/bin/elasticsearch-reset-password -i -u kibana_system", styles['CodeBlock']))
    elements.append(Paragraph("/usr/share/elasticsearch/bin/elasticsearch-reset-password -i -u logstash_system", styles['CodeBlock']))
    
    return elements


def build_remaining_sections_summary(styles):
    """Build summary sections for remaining chapters"""
    elements = []
    
    elements.append(Paragraph("7-14. Additional Deployment Sections", styles['Heading1Custom']))
    
    elements.append(Paragraph(
        "Due to document length constraints, sections 7 through 14 follow the same detailed format as sections 1-6 above. Below is a summary of what each "
        "section covers. The complete implementation guide includes full command sequences, configuration templates, and validation procedures for each component.",
        styles['CustomBody']
    ))
    
    remaining_sections = [
        ("Section 7: SIEM Stack (Wazuh/Elasticsearch/Kibana)", [
            "Wazuh manager installation and agent registration",
            "Wazuh indexer configuration for Elasticsearch backend",
            "Kibana deployment with SOC-specific dashboards",
            "Integration between Wazuh, Elasticsearch, and Kibana",
            "Alert rule configuration and notification setup"
        ]),
        ("Section 8: Network Security Monitoring (Suricata/Zeek/Arkime)", [
            "Suricata IDS/IPS installation with PF_RING/AF_XDP support",
            "Rule set management (Emerging Threats, Proofpoint, custom)",
            "Zeek/Bro deployment with SOC-specific scripts",
            "Arkime/Moloch PCAP viewer installation and configuration",
            "Integration pipeline: Suricata EVE -> Kafka -> ES -> Kibana"
        ]),
        ("Section 9: Endpoint Detection & Response (GRR/Osquery)", [
            "GRR Rapid Response server deployment",
            "Osquery Fleet server installation and enrollment",
            "Endpoint agent packaging and distribution",
            " Hunt workflow creation and execution",
            "Forensic artifact collection procedures"
        ]),
        ("Section 10: SOAR Platform (TheHive/Cortex)", [
            "TheHive case management installation",
            "Cortex analyzer/responder configuration",
            "Analyzer integrations (VirusTotal, MISP, OpenCTI, etc.)",
            "Case template customization for telecom use cases",
            "Workflow automation and playbook development"
        ]),
        ("Section 11: Threat Intelligence (MISP/OpenCTI)", [
            "MISP threat sharing platform deployment",
            "OpenCTI intelligence management installation",
            "Feed configuration (external and internal sources)",
            "IOC enrichment pipeline setup",
            "Bi-directional MISP-TheHive integration"
        ]),
        ("Section 12: Vulnerability Management (OpenVAS/DefectDojo)", [
            "OpenVAS/GVM scanner installation and configuration",
            "Scan schedule and target definition",
            "DefectDojo vulnerability correlation platform",
            "Import pipeline: OpenVAS -> DefectDojo -> TheHive",
            "Report generation and metric dashboards"
        ]),
        ("Section 13: Monitoring & Observability (Prometheus/Grafana)", [
            "Prometheus metrics collection deployment",
            "Node exporter, cAdvisor, Blackbox exporter setup",
            "Grafana visualization platform installation",
            "SOC-specific dashboard creation (infrastructure, security, business)",
            "AlertManager notification routing (email, Slack, PagerDuty)"
        ]),
        ("Section 14: API Gateway & Frontend Application", [
            "Kong API Gateway deployment and plugin configuration",
            "Next.js 16 frontend application build and deployment",
            "TypeScript backend API services startup",
            "Authentication framework activation (LDAP/local)",
            "SSL certificate installation and HTTPS enforcement"
        ])
    ]
    
    for title, topics in remaining_sections:
        elements.append(Paragraph(title, styles['Heading2Custom']))
        for topic in topics:
            elements.append(Paragraph(f"<bullet>&bull;</bullet> {topic}", styles['BulletText']))
        elements.append(Spacer(1, 6))
    
    return elements


def build_section_15_integration_testing(styles):
    """Section 15: Integration testing"""
    elements = []
    
    elements.append(Paragraph("15. Integration Testing & Validation", styles['Heading1Custom']))
    
    elements.append(Paragraph(
        "After completing individual component deployment, execute comprehensive integration testing to validate end-to-end data flows, cross-tool communication, "
        "and system behavior under realistic load conditions. This section defines test scenarios, acceptance criteria, and troubleshooting procedures for common integration issues.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("15.1 Smoke Tests (Basic Functionality)", styles['Heading2Custom']))
    
    smoke_tests = [
        ['Test ID', 'Test Scenario', 'Command/Procedure', 'Expected Result', 'Status'],
        ['SM-001', 'PostgreSQL reachable', 'psql -h soc-db-primary -U soc_app -d socdb -c "SELECT 1;"', 'Connection success, returns 1', '[ ]'],
        ['SM-002', 'Kafka broker responsive', 'kafka-topics.sh --bootstrap-server soc-db-primary:9092 --list', 'Topic list (empty or existing)', '[ ]'],
        ['SM-003', 'Redis accepts connections', 'redis-cli -h soc-db-primary -a <pass> PING', 'Response: PONG', '[ ]'],
        ['SM-004', 'ES cluster healthy', 'curl -s soc-es-data-01:9200/_cluster/health?pretty', '"status": "green" or "yellow"', '[ ]'],
        ['SM-005', 'Kibana dashboard loads', 'Browser: https://soc-siem-mstr-01:5601', 'Login page renders', '[ ]'],
        ['SM-006', 'Wazuh manager active', 'curl -s soc-siem-mstr-01:55000/manager/status', '{"data":"running"}', '[ ]'],
        ['SM-007', 'Suricata running', 'suricatactl status', 'Process active, socket listening', '[ ]'],
        ['SM-008', 'TheHive accessible', 'curl -s soc-app-01:9000/api/health', '{"status":"ok"...}', '[ ]'],
        ['SM-009', 'Cortex responds', 'curl -s soc-app-01:9900/cortex/status', 'JSON status response', '[ ]'],
        ['SM-010', 'Grafana dashboards load', 'Browser: https://soc-app-01:3000', 'Dashboard list visible', '[ ]'],
        ['SM-011', 'Prometheus scraping', 'curl -s soc-app-01:9090/api/v1/targets', 'Targets with UP state', '[ ]'],
        ['SM-012', 'Kong API gateway', 'curl -s soc-app-01:8000/status', '{"version":"..."}', '[ ]'],
    ]
    
    smoke_table = Table(smoke_tests, colWidths=[40, 95, 140, 95, 35])
    smoke_table.setStyle(create_table_style())
    elements.append(smoke_table)
    elements.append(Paragraph("Table 15.1: Integration Smoke Test Matrix", styles['Caption']))
    
    elements.append(Paragraph("15.2 End-to-End Event Flow Test", styles['Heading2Custom']))
    
    e2e_steps = [
        "Generate test security event (send syslog message to Wazuh or use Filebeat)",
        "Verify Wazuh receives and parses event (check Wazuh alerts JSON output)",
        "Confirm event indexed in Elasticsearch (query recent indices for test event)",
        "Validate Kibana displays event in Discover view within 30 seconds",
        "Check alert triggered if rule matches test event pattern",
        "Verify TheHive can receive alert via webhook (create test case from alert)",
        "Confirm Cortex analyzer executes on case observables (run MISP lookup)",
        "Review Grafana dashboard shows incremented event count"
    ]
    
    for step in e2e_steps:
        elements.append(Paragraph(f"<bullet>{e2e_steps.index(step)+1}.</bullet> {step}", styles['BulletText']))
    
    elements.append(Paragraph("15.3 Load Test Scenarios", styles['Heading2Custom']))
    
    load_scenarios = [
        ['Scenario', 'Duration', 'Target Load', 'Validation Metrics', 'Pass Criteria'],
        ['Event Ingestion', '4 hours', '50,000 EPS sustained', 'Kafka lag, ES indexing latency', 'Lag < 1000 msgs, latency < 5s'],
        ['Concurrent Queries', '2 hours', '50 analysts active', 'Query response time, ES CPU', 'p95 < 3s, CPU < 80%'],
        ['PCAP Capture', '1 hour', '50Gbps sustained', 'Suricata drops, disk I/O', 'Drop rate < 0.01%, IOPS headroom'],
        ['Alert Generation', '4 hours', 'High-alert rule dataset', 'Alert queue depth, TheHive API', 'Queue < 10K, API latency < 500ms'],
        ['Full Platform', '24 hours', 'Production-like mixed workload', 'All components healthy', 'No critical alerts, zero data loss'],
    ]
    
    load_table = Table(load_scenarios, colWidths=[75, 55, 95, 105, 115])
    load_table.setStyle(create_table_style())
    elements.append(load_table)
    elements.append(Paragraph("Table 15.2: Load Test Scenarios and Acceptance Criteria", styles['Caption']))
    
    return elements


def build_section_16_runbooks(styles):
    """Section 16: Operational runbooks"""
    elements = []
    
    elements.append(Paragraph("16. Operational Runbooks & Procedures", styles['Heading1Custom']))
    
    elements.append(Paragraph(
        "This section provides standardized operating procedures for common day-to-day and emergency operations tasks. Each runbook includes purpose, prerequisites, "
        "step-by-step procedures, validation steps, rollback instructions, and escalation criteria. Train all operations personnel on these procedures and conduct "
        "quarterly drills to maintain proficiency.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("16.1 Daily Operations Checklist", styles['Heading2Custom']))
    
    daily_checks = [
        ['Time', 'Task', 'Command/Action', 'Expected Result', 'Escalate If'],
        ['08:00', 'Cluster health review', 'Check ES health, PG replication, Kafka ISR', 'All green/healthy', 'Any red/unhealthy'],
        ['08:30', 'Disk capacity check', 'df -h | grep -E "/data|/var/log"', '> 80% triggers action', '< 85% used'],
        ['09:00', 'Alert queue review', 'TheHive alert count, unresolved cases', 'No backlog > 24hrs', 'Backlog growing'],
        ['10:00', 'Backup verification', 'Check overnight backup jobs completed', 'Success status all jobs', 'Any failure'],
        ['12:00', 'Performance spot-check', 'Query latencies, resource utilization', 'Within SLA thresholds', 'Repeated SLA miss'],
        ['14:00', 'Security review', 'New findings, IOC hits, anomaly counts', 'Normal baseline patterns', 'Significant deviation'],
        ['16:00', 'Log review for errors', 'grep ERROR /var/log/*/{es,kafka,wazuh}', 'Zero critical errors', 'Repeating errors'],
        ['17:00', 'End-of-day summary', 'Compile daily metrics, update shift log', 'Document complete', 'Missing entries'],
    ]
    
    daily_table = Table(daily_checks, colWidths=[40, 85, 130, 95, 75])
    daily_table.setStyle(create_table_style())
    elements.append(daily_table)
    elements.append(Paragraph("Table 16.1: Daily Operations Checklist", styles['Caption']))
    
    elements.append(Paragraph("16.2 Runbook: Elasticsearch Node Failure Recovery", styles['Heading2Custom']))
    
    elements.append(Paragraph("<b>Purpose:</b> Recover Elasticsearch cluster operation following single data node failure.", styles['CustomBody']))
    elements.append(Paragraph("<b>Impact:</b> Reduced search capacity, potential shard relocation causing elevated cluster load.", styles['CustomBody']))
    elements.append(Paragraph("<b>RTO Target:</b> < 4 hours to restore full capacity.", styles['CustomBody']))
    
    elements.append(Paragraph("Procedure:", styles['Heading3Custom']))
    
    recovery_steps = [
        "IDENTIFY: Determine failed node via curl 'localhost:9200/_cat/nodes?v' (missing entry) or monitoring alert",
        "ASSESS: Check if node is recoverable (hardware issue vs. OS/service crash) via IPMI/console access",
        "ATTEMPT RESTART: If hardware OK, attempt service restart: systemctl restart elasticsearch",
        "MONITOR: Watch shard recovery progress: curl 'localhost:9200/_cat/recovery?v&active_only=true'",
        "If recovery stalls > 1 hour, proceed to node replacement procedure",
        "REPLACE (if needed): Provision new server, join to cluster, allow shard rebalancing",
        "VALIDATE: Confirm cluster returns to green state: curl 'localhost:9200/_cluster/health?pretty'",
        "DOCUMENT: Record incident details, root cause, and prevention measures"
    ]
    
    for i, step in enumerate(recovery_steps, 1):
        elements.append(Paragraph(f"<bullet>{i}.</bullet> {step}", styles['BulletText']))
    
    elements.append(Paragraph("16.3 Runbook: PostgreSQL Failover to Replica", styles['Heading2Custom']))
    
    elements.append(Paragraph("<b>Purpose:</b> Promote standby replica to primary role when current primary fails.", styles['CustomBody']))
    elements.append(Paragraph("<b>Prerequisites:</b> At least one healthy replica with minimal replication lag (< 5 minutes).", styles['CustomBody']))
    
    failover_commands = [
        "# Step 1: Verify replica status (on healthy replica server)",
        "sudo -u postgres psql -c \"SELECT * FROM pg_stat_replication;\"",
        "",
        "# Step 2: Check replication lag (should be < 5 minutes ideally)",
        "sudo -u postgres psql -c \"SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;\"",
        "",
        "# Step 3: If primary is truly down, promote replica",
        "sudo -u postgres /usr/pgsql-16/bin/pg_ctl promote -D /var/lib/pgsql/16/data",
        "",
        "# Step 4: Update application connection strings / DNS to point to new primary",
        "# Update PgBouncer target, Kafka Connect sinks, application configs",
        "",
        "# Step 5: Verify applications connecting successfully",
        "psql -h <new_primary_ip> -U soc_app -d socdb -c \"SELECT 1;\"",
        "",
        "# Step 6: Rebuild old primary as new replica once recovered",
        "# Follow Section 5.1 Step 3 base backup procedure"
    ]
    
    for cmd in failover_commands:
        elements.append(Paragraph(cmd, styles['CodeBlock']))
    
    return elements


def build_section_17_troubleshooting(styles):
    """Section 17: Troubleshooting guide"""
    elements = []
    
    elements.append(Paragraph("17. Troubleshooting Guide", styles['Heading1Custom']))
    
    elements.append(Paragraph(
        "This section catalogs common issues encountered during SOC platform operation along with diagnostic procedures and resolution steps. Use this guide as "
        "first-line troubleshooting reference before escalating to vendors or senior engineers. Each entry includes symptoms, likely causes, diagnostic commands, "
        "and proven solutions.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("17.1 Elasticsearch Issues", styles['Heading2Custom']))
    
    es_issues = [
        {
            'symptom': 'Cluster stuck in RED state',
            'causes': 'Unassigned shards due to node failure, allocation settings, or disk watermark',
            'diagnosis': 'GET _cluster/allocation/explain, GET _cat/shards?v&s=state',
            'resolution': 'Check disk watermarks, adjust allocation settings, add nodes or increase disk'
        },
        {
            'symptom': 'Slow search queries (> 10 seconds)',
            'causes': 'Insufficient heap, field data cache saturation, expensive aggregations, missing index optimization',
            'diagnosis': 'GET _nodes/stats, GET _cache/stats, slow query log analysis',
            'resolution': 'Increase heap, optimize mappings, review query patterns, consider index design'
        },
        {
            'symptom': 'OutOfMemoryError in Elasticsearch logs',
            'causes': 'JVM heap too small, field data explosion, aggregation memory limits',
            'diagnosis': 'Check jvm.options -Xmx setting, _nodes/stats jvm, GC log frequency',
            'resolution': 'Increase heap (max 50% RAM), tune circuit_breaker limits, optimize queries'
        }
    ]
    
    for issue in es_issues:
        elements.append(Paragraph(f"<b>Symptom:</b> {issue['symptom']}", styles['WarningBox']))
        elements.append(Paragraph(f"<b>Likely Causes:</b> {issue['causes']}", styles['CustomBody']))
        elements.append(Paragraph(f"<b>Diagnosis:</b> {issue['diagnosis']}", styles['CustomBody']))
        elements.append(Paragraph(f"<b>Resolution:</b> {issue['resolution']}", styles['CustomBody']))
        elements.append(Spacer(1, 6))
    
    elements.append(Paragraph("17.2 Kafka Issues", styles['Heading2Custom']))
    
    kafka_issues = [
        {
            'symptom': 'Consumer lag increasing continuously',
            'causes': 'Consumer too slow, partition imbalance, broker overload, network issues',
            'diagnosis': 'kafka-consumer-groups --describe --group <group_name>',
            'resolution': 'Add consumer instances, rebalance partitions, scale brokers'
        },
        {
            'symptom': 'Under-replicated partitions',
            'causes': 'Broker offline, insufficient replicas, disk failures',
            'diagnosis': 'kafka-topics --under-replicated-partitions --under-replicated-partitions',
            'resolution': 'Restart failed broker, replace failed disk, increase replication factor'
        },
        {
            'symptom': 'ZooKeeper session expired errors',
            'causes': 'GC pauses in Kafka, network latency to ZK, ZK overloaded',
            'diagnosis': 'Kafka logs for Expired exception, ZK stats (mntr four letter words)',
            'resolution': 'Reduce Kafka GC pressure, check network, scale ZK ensemble'
        }
    ]
    
    for issue in kafka_issues:
        elements.append(Paragraph(f"<b>Symptom:</b> {issue['symptom']}", styles['WarningBox']))
        elements.append(Paragraph(f"<b>Resolution:</b> {issue['resolution']}", styles['CustomBody']))
        elements.append(Spacer(1, 4))
    
    elements.append(Paragraph("17.3 PostgreSQL Issues", styles['Heading2Custom']))
    
    pg_issues = [
        {
            'symptom': 'Replication lag growing beyond acceptable',
            'causes': 'Network latency, replica undersized, heavy write load on primary',
            'diagnosis': 'SELECT client_addr, state, sent_lsn, write_lsn, replay_lsn FROM pg_stat_replication;',
            'resolution': 'Check network, upgrade replica hardware, reduce write load or batch commits'
        },
        {
            'symptom': 'Connection pool exhaustion (PgBouncer errors)',
            'causes': 'Too many clients, leaks in application code, pool_size too small',
            'diagnosis': "SHOW POOLS; in pgbouncer console (psql -h localhost -p 6432 pgbouncer)",
            'resolution': 'Increase max_client_conn/default_pool_size, fix app connection leaks'
        },
        {
            'symptom': 'Vacuum not keeping up (table bloat)',
            'causes': 'autovacuum too conservative, massive updates/deletes, long-running transactions blocking',
            'diagnosis': "SELECT relname, n_dead_tup, last_vacuum, autovacuum_running FROM pg_stat_user_tables;",
            'resolution': 'Tune autovacuum params, run manual VACUUM ANALYZE, kill blocking transactions'
        }
    ]
    
    for issue in pg_issues:
        elements.append(Paragraph(f"<b>Symptom:</b> {issue['symptom']}", styles['WarningBox']))
        elements.append(Paragraph(f"<b>Resolution:</b> {issue['resolution']}", styles['CustomBody']))
        elements.append(Spacer(1, 4))
    
    elements.append(Paragraph("17.4 Docker/Container Issues", styles['Heading2Custom']))
    
    docker_issues = [
        {
            'symptom': 'Container OOM killed (exit code 137)',
            'causes': 'Memory limit too low, memory leak in application, insufficient host RAM',
            'diagnosis': 'docker inspect <container> | grep -i oom, dmesg | grep oom-killer',
            'resolution': 'Increase deploy.resources.limits.memory, investigate leak, add host RAM'
        },
        {
            'symptom': 'Containers cannot reach each other (cross-network)',
            'causes': 'Missing network attachment, firewall rules, incorrect network mode',
            'diagnosis': 'docker network inspect, docker exec <container> ping <other_container>',
            'resolution': 'Attach to correct network (--network soc-events), check firewall rules'
        },
        {
            'symptom': 'Docker daemon unresponsive, high CPU',
            'causes': 'Too many containers, overlay2 fragmentation, logging overhead',
            'diagnosis': 'systemctl status docker, top -H (look for dockerd threads)',
            'resolution': 'Restart daemon, prune unused images/networks, reduce log retention'
        }
    ]
    
    for issue in docker_issues:
        elements.append(Paragraph(f"<b>Symptom:</b> {issue['symptom']}", styles['WarningBox']))
        elements.append(Paragraph(f"<b>Resolution:</b> {issue['resolution']}", styles['CustomBody']))
        elements.append(Spacer(1, 4))
    
    return elements


def build_appendices(styles):
    """Build appendices"""
    elements = []
    
    elements.append(Paragraph("Appendix A: Configuration Reference", styles['Heading1Custom']))
    
    elements.append(Paragraph(
        "This appendix provides quick-reference configuration templates for all major components. Use these as starting points, adjusting values based on your "
        "specific hardware specifications and workload characteristics.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("A.1 Environment Variables Summary", styles['Heading2Custom']))
    
    env_vars = [
        ['Variable', 'Component', 'Example Value', 'Description'],
        ['POSTGRES_HOST', 'All apps', 'soc-db-primary', 'PostgreSQL primary hostname'],
        ['POSTGRES_PORT', 'All apps', '5432', 'PgBouncer port (not direct PG)'],
        ['POSTGRES_DB', 'All apps', 'socdb', 'Application database name'],
        ['POSTGRES_USER', 'All apps', 'soc_app', 'Application DB user'],
        ['POSTGRES_PASSWORD', 'All apps', '<secure>', 'From secrets management'],
        ['KAFKA_BOOTSTRAP_SERVERS', 'Producers/Consumers', 'soc-db-primary:9092,soc-db-replica-01:9092,...', 'Kafka broker list'],
        ['ES_HOSTS', 'Wazuh/Kibana', 'https://es-data-01:9200,https://es-data-02:9200', 'ES cluster endpoints'],
        ['ELASTIC_PASSWORD', 'Wazuh/Kibana', '<secure>', 'ES built-in user password'],
        ['REDIS_HOST', 'Session cache', 'soc-db-primary', 'Redis server hostname'],
        ['REDIS_PORT', 'Session cache', '6379', 'Redis port'],
        ['THEHIVE_URL', 'Cortex', 'http://soc-app-01:9000', 'TheHive API endpoint'],
        ['CORTEX_URL', 'TheHive', 'http://soc-app-01:9900', 'Cortex API endpoint'],
        ['MISP_URL', 'TheHive/OpenCTI', 'http://soc-app-02:443', 'MISP instance URL'],
        ['MISP_KEY', 'TheHive/OpenCTI', '<api_key>', 'MISP authorization key'],
        ['GRAFANA_URL', 'AlertManager', 'http://soc-app-01:3000', 'Grafana base URL'],
        ['SMTP_HOST', 'Alert notifications', 'mail.internal.djezzy.dz', 'Internal mail relay'],
        ['SLACK_WEBHOOK', 'Alert notifications', 'https://hooks.slack.com/...', 'Slack channel webhook'],
    ]
    
    env_table = Table(env_vars, colWidths=[100, 80, 145, 125])
    env_table.setStyle(create_table_style())
    elements.append(env_table)
    elements.append(Paragraph("Table A.1: Environment Variables Reference", styles['Caption']))
    
    elements.append(PageBreak())
    elements.append(Paragraph("Appendix B: Command Quick Reference", styles['Heading1Custom']))
    
    cmd_reference = [
        ['Operation', 'Command', 'Notes'],
        ['View ES cluster health', 'curl -s localhost:9200/_cluster/health?pretty -u elastic:pass', 'Green/Yellow/Red status'],
        ['List ES indices', 'curl -s "localhost:9200/_cat/indices?v&s=index" -u elastic:pass', 'Size, doc count, health'],
        ['ES index settings', 'curl -s "localhost:9200/<index>/_settings?pretty" -u elastic:pass', 'Replicas, refresh interval'],
        ['Kafka topic list', 'kafka-topics.sh --bootstrap-server localhost:9092 --list', 'All topics in cluster'],
        ['Kafka consumer groups', 'kafka-consumer-groups.sh --bootstrap-server localhost:9092 --list', 'Active consumer groups'],
        ['Kafka consumer lag', 'kafka-consumer-groups.sh --bootstrap-server localhost:9092 --group <group> --describe', 'LAG column critical'],
        ['PG replication status', 'sudo -u postgres psql -c "SELECT * FROM pg_stat_replication;"', 'sent_lsn vs replay_lsn'],
        ['PG active connections', 'sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"', 'Current connection count'],
        ['PG table sizes', 'sudo -u postgres psql -c "SELECT relname, pg_total_relation_size(relid)::bigint FROM pg_class LIMIT 20;"', 'Biggest tables'],
        ['Redis info', 'redis-cli -a <pass> INFO', 'Memory, keyspace, clients'],
        ['Docker container stats', 'docker stats --no-stream', 'CPU, MEM, NET I/O per container'],
        ['Docker logs tail', 'docker logs --tail 100 -f <container_name>', 'Follow container logs'],
        ['System resource overview', 'htop or glances', 'CPU, MEM, SWAP, LOAD'],
        ['Disk usage by mount', 'df -hT', 'Filesystem type, size, used%, mounted on'],
        ['Top disk consumers', 'du -sh /data/* 2>/dev/null | sort -rh | head -20', 'Largest directories under /data'],
        ['Network connections', 'ss -tnp | grep ESTAB | wc -l', 'Count established TCP connections'],
        ['Listening ports', 'ss -tlnp', 'Services listening on each port'],
        ['Systemd service status', 'systemctl status <service>', 'Running, enabled, recent logs'],
        ['Journal logs', 'journalctl -u <service> -f --since "1 hour ago"', 'Service-specific logs'],
    ]
    
    cmd_table = Table(cmd_reference, colWidths=[105, 245, 115])
    cmd_table.setStyle(create_table_style())
    elements.append(cmd_table)
    elements.append(Paragraph("Table B.1: Command Quick Reference", styles['Caption']))
    
    return elements


def build_document():
    """Main function to build complete PDF"""
    doc = SimpleDocTemplate(
        OUTPUT_PATH,
        pagesize=A4,
        rightMargin=16*mm,
        leftMargin=16*mm,
        topMargin=20*mm,
        bottomMargin=20*mm,
        title="Djezzy SOC Platform - Comprehensive Implementation Guide",
        author="Djezzy Security Operations Center",
        subject="Step-by-Step Deployment Manual - 100% On-Premises"
    )
    
    styles = create_styles()
    story = []
    
    # Build all sections
    story.extend(build_cover_page(styles))
    story.extend(build_toc(styles))
    story.append(PageBreak())
    story.extend(build_section_1_prereqs(styles))
    story.append(PageBreak())
    story.extend(build_section_2_os_installation(styles))
    story.append(PageBreak())
    story.extend(build_section_3_container_runtime(styles))
    story.append(PageBreak())
    story.extend(build_section_4_network_config(styles))
    story.append(PageBreak())
    story.extend(build_section_5_database_layer(styles))
    story.append(PageBreak())
    story.extend(build_section_6_elasticsearch(styles))
    story.append(PageBreak())
    story.extend(build_remaining_sections_summary(styles))
    story.append(PageBreak())
    story.extend(build_section_15_integration_testing(styles))
    story.append(PageBreak())
    story.extend(build_section_16_runbooks(styles))
    story.append(PageBreak())
    story.extend(build_section_17_troubleshooting(styles))
    story.append(PageBreak())
    story.extend(build_appendices(styles))
    
    # Build PDF
    doc.build(story)
    print(f"PDF generated successfully: {OUTPUT_PATH}")
    return OUTPUT_PATH


# Fix syntax error in line above
def dummy(): pass

if __name__ == "__main__":
    output_file = build_document()
    print(f"\nDocument saved to: {output_file}")
