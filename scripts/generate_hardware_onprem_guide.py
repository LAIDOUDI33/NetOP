#!/usr/bin/env python3
"""
Djezzy SOC Platform - 100% On-Premises Hardware Architecture & Implementation Guide
Pure On-Premises Deployment - No Cloud Components - Air-Gap Capable
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
    PageBreak, Image, ListFlowable, ListItem, KeepTogether
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

# Cascade Palette (auto-generated)
PAGE_BG       = colors.HexColor('#f0f0ef')
SECTION_BG    = colors.HexColor('#f2f2f0')
CARD_BG       = colors.HexColor('#eae9e6')
TABLE_STRIPE  = colors.HexColor('#f1f0ed')
HEADER_FILL   = colors.HexColor('#796f50')
COVER_BLOCK   = colors.HexColor('#80744f')
BORDER        = colors.HexColor('#c4c0b6')
ICON          = colors.HexColor('#ab9142')
ACCENT        = colors.HexColor('#96771c')
ACCENT_2      = colors.HexColor('#5739ae')
TEXT_PRIMARY  = colors.HexColor('#242321')
TEXT_MUTED    = colors.HexColor('#8a8780')
SEM_SUCCESS   = colors.HexColor('#479b63')
SEM_WARNING   = colors.HexColor('#9e7f41')
SEM_ERROR     = colors.HexColor('#8e443e')
SEM_INFO      = colors.HexColor('#4c7daf')

OUTPUT_PATH = '/home/z/my-project/download/Djezzy_SOC_OnPremises_Hardware_Architecture_Guide.pdf'


def create_styles():
    """Create custom paragraph styles"""
    styles = getSampleStyleSheet()
    
    styles.add(ParagraphStyle(
        name='CustomTitle',
        fontName='NotoSerifSC-Bold',
        fontSize=26,
        leading=32,
        alignment=TA_CENTER,
        textColor=TEXT_PRIMARY,
        spaceAfter=20
    ))
    
    styles.add(ParagraphStyle(
        name='Subtitle',
        fontName='NotoSerifSC',
        fontSize=13,
        leading=17,
        alignment=TA_CENTER,
        textColor=TEXT_MUTED,
        spaceAfter=25
    ))
    
    styles.add(ParagraphStyle(
        name='Heading1Custom',
        fontName='NotoSerifSC-Bold',
        fontSize=18,
        leading=24,
        textColor=HEADER_FILL,
        spaceBefore=22,
        spaceAfter=12,
    ))
    
    styles.add(ParagraphStyle(
        name='Heading2Custom',
        fontName='NotoSerifSC-Bold',
        fontSize=13,
        leading=17,
        textColor=ACCENT,
        spaceBefore=16,
        spaceAfter=9
    ))
    
    styles.add(ParagraphStyle(
        name='Heading3Custom',
        fontName='NotoSansSC-Bold',
        fontSize=11,
        leading=14,
        textColor=TEXT_PRIMARY,
        spaceBefore=10,
        spaceAfter=6
    ))
    
    styles.add(ParagraphStyle(
        name='CustomBody',
        fontName='NotoSerifSC',
        fontSize=10,
        leading=15,
        alignment=TA_JUSTIFY,
        textColor=TEXT_PRIMARY,
        spaceBefore=5,
        spaceAfter=5,
        firstLineIndent=0
    ))
    
    styles.add(ParagraphStyle(
        name='BulletText',
        fontName='NotoSerifSC',
        fontSize=9.5,
        leading=14,
        textColor=TEXT_PRIMARY,
        leftIndent=15,
        spaceBefore=3,
        spaceAfter=3
    ))
    
    styles.add(ParagraphStyle(
        name='TableHeader',
        fontName='NotoSansSC-Bold',
        fontSize=9,
        leading=11,
        alignment=TA_CENTER,
        textColor=colors.white
    ))
    
    styles.add(ParagraphStyle(
        name='TableCell',
        fontName='NotoSerifSC',
        fontSize=9,
        leading=11,
        alignment=TA_LEFT,
        textColor=TEXT_PRIMARY
    ))
    
    styles.add(ParagraphStyle(
        name='Caption',
        fontName='NotoSerifSC',
        fontSize=9,
        leading=11,
        alignment=TA_CENTER,
        textColor=TEXT_MUTED,
        spaceBefore=5,
        spaceAfter=10
    ))
    
    styles.add(ParagraphStyle(
        name='ImportantNote',
        fontName='NotoSansSC-Bold',
        fontSize=9.5,
        leading=14,
        textColor=SEM_ERROR,
        leftIndent=10,
        rightIndent=10,
        spaceBefore=8,
        spaceAfter=8,
        borderWidth=1,
        borderColor=SEM_ERROR,
        borderPadding=8,
        backColor=colors.HexColor('#fef2f2')
    ))
    
    return styles


def create_table_style():
    """Create consistent table styling"""
    return TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
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


def build_cover_page(styles):
    """Build cover page section"""
    elements = []
    
    # Title block
    elements.append(Spacer(1, 60))
    elements.append(Paragraph(
        "DJEZZY NATIONAL SOC PLATFORM",
        styles['CustomTitle']
    ))
    elements.append(Spacer(1, 10))
    elements.append(Paragraph(
        "100% On-Premises Hardware Architecture<br/>& Implementation Guide",
        styles['Subtitle']
    ))
    elements.append(Spacer(1, 30))
    
    # Document info box
    info_data = [
        ['Document Classification', 'CONFIDENTIAL - INTERNAL USE ONLY'],
        ['Deployment Model', 'PURE ON-PREMISES (Zero Cloud Dependencies)'],
        ['Air-Gap Capability', 'FULLY SUPPORTED'],
        ['Data Sovereignty', '100% Algerian Territory Compliance'],
        ['Version', '1.0 - Production Ready'],
        ['Date', datetime.now().strftime('%B %d, %Y')],
    ]
    
    info_table = Table(info_data, colWidths=[160, 280])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), SECTION_BG),
        ('BACKGROUND', (1, 0), (1, -1), CARD_BG),
        ('TEXTCOLOR', (0, 0), (-1, -1), TEXT_PRIMARY),
        ('FONTNAME', (0, 0), (0, -1), 'NotoSansSC-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(info_table)
    
    elements.append(Spacer(1, 40))
    
    # Scope statement
    elements.append(Paragraph(
        "<b>Document Scope</b>",
        styles['Heading3Custom']
    ))
    elements.append(Paragraph(
        "This document provides comprehensive hardware architecture specifications and implementation procedures "
        "for deploying the Djezzy National Security Operations Center (SOC) Platform entirely within Djezzy-owned "
        "physical facilities. All infrastructure components including compute servers, storage systems, network "
        "fabric, backup systems, disaster recovery site, development environments, and operational tooling are "
        "deployed on-premises with zero dependencies on external cloud services or third-party hosted platforms.",
        styles['CustomBody']
    ))
    
    elements.append(Spacer(1, 20))
    
    # Critical requirement callout
    elements.append(Paragraph(
        "<b>Critical Design Constraint: Zero External Connectivity Required</b>",
        styles['Heading3Custom']
    ))
    elements.append(Paragraph(
        "The platform architecture supports fully isolated (air-gapped) operation mode. Once initial deployment "
        "and container image loading is complete, the SOC platform can operate indefinitely without any external "
        "network connections. This capability is mandatory for national telecommunications security infrastructure "
        "subject to Algerian data protection regulations and national security requirements.",
        styles['CustomBody']
    ))
    
    elements.append(PageBreak())
    return elements


def build_executive_summary(styles):
    """Build executive summary section"""
    elements = []
    
    elements.append(Paragraph("1. Executive Summary", styles['Heading1Custom']))
    
    elements.append(Paragraph(
        "This Hardware Architecture Guide defines the complete physical infrastructure required to deploy and operate "
        "the Djezzy National Security Operations Center (SOC) Platform as a 100% on-premises solution with zero cloud "
        "dependencies. The platform has been architected from the ground up to support air-gapped operation, ensuring "
        "that all security monitoring, event processing, threat intelligence, incident response, and analytical "
        "capabilities function independently of external network connectivity once deployment is complete. This design "
        "aligns with stringent Algerian telecommunications regulatory requirements mandating that subscriber data, "
        "network traffic records, and security intelligence remain within national borders under complete organizational control.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph(
        "The recommended deployment spans two geographically separated data center sites operating in active-passive "
        "configuration for disaster recovery purposes. The primary site houses the full production cluster comprising "
        "fourteen (14) physical servers organized into functional roles optimized for the specific workload characteristics "
        "of each service category. The secondary disaster recovery site maintains a reduced-capability standby configuration "
        "with eight (8) servers capable of assuming full production operations within the defined recovery time objective "
        "of thirty minutes following site failure declaration. Both sites operate entirely independently with no requirement "
        "for cross-site connectivity during normal operations, though dedicated fiber links enable asynchronous data replication "
        "when business continuity policies permit such connectivity.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("1.1 Platform Resource Requirements", styles['Heading2Custom']))
    
    elements.append(Paragraph(
        "The aggregate resource requirements reflect production-scale deployment supporting fifty billion security events "
        "annually, eighty billion Call Detail Records per year, real-time monitoring for fifteen million mobile subscribers, "
        "and sustained packet capture at one hundred gigabits per second line rate across monitored network segments. These "
        "figures incorporate twenty percent headroom above measured baseline consumption to accommodate traffic spikes during "
        "security incidents, organic growth over the thirty-six month planning horizon, and capacity reserved for additional "
        "data sources that may be integrated during future expansion phases.",
        styles['CustomBody']
    ))
    
    # Resource summary table
    resource_data = [
        ['Resource Category', 'Primary Site', 'DR Site', 'Total Capacity', 'Recommended Config'],
        ['Compute (vCPU Cores)', '138 cores', '72 cores', '210 cores', 'Intel Xeon Gold/Platinum'],
        ['RAM Memory', '512 GB', '256 GB', '768 GB', 'DDR4-3200 ECC Registered'],
        ['NVMe Primary Storage', '85 TB', '40 TB', '125 TB', 'Enterprise U.3 NVMe'],
        ['HDD Archive Storage', '120 TB', '60 TB', '180 TB', 'Enterprise SAS 12Gbps'],
        ['SSD Cache/Log Storage', '8 TB', '4 TB', '12 TB', 'NVMe RAID 1 pairs'],
        ['Network (Data Plane)', '400 Gbps', '200 Gbps', '600 Gbps', '100GbE/25GbE fabric'],
        ['Network (Management)', '40 Gbps', '20 Gbps', '60 Gbps', 'Dedicated OOB network'],
    ]
    
    resource_table = Table(resource_data, colWidths=[95, 65, 55, 75, 105])
    resource_table.setStyle(create_table_style())
    elements.append(resource_table)
    elements.append(Paragraph("Table 1.1: Aggregate Resource Requirements by Site", styles['Caption']))
    
    elements.append(Paragraph("1.2 Design Principles", styles['Heading2Custom']))
    
    principles = [
        "<b>Data Sovereignty:</b> All security data, subscriber information, network records, and threat intelligence reside exclusively on Djezzy-owned hardware within Algerian territory. No data ever traverses external networks or foreign jurisdictions under any circumstances.",
        
        "<b>Air-Gap Operation:</b> The platform architecture supports fully disconnected operation. Container images, software packages, and configuration artifacts are loaded during initial deployment via secure media transfer. Subsequent operation requires zero inbound or outbound network connectivity.",
        
        "<b>High Availability:</b> All critical services deploy in redundant configurations with automatic failover. The primary site achieves 99.99% availability through N+1 server redundancy, dual power feeds, multipath networking, and hot-swappable component replacement without service interruption.",
        
        "<b>Disaster Recovery:</b> Geographically separated DR site maintains standby capability for all critical functions. Recovery Point Objective (RPO) of fifteen minutes maximum; Recovery Time Objective (RTO) of thirty minutes for Tier-1 services following failover initiation.",
        
        "<b>Performance at Scale:</b> Infrastructure sizing supports sustained ingestion of fifty thousand events per second, concurrent query handling for fifty analysts, sub-three-second search response times on multi-billion-event indices, and line-rate packet capture without loss at 100Gbps."
    ]
    
    for principle in principles:
        elements.append(Paragraph(f"<bullet>&bull;</bullet> {principle}", styles['BulletText']))
    
    return elements


def build_primary_site_architecture(styles):
    """Build primary site detailed architecture"""
    elements = []
    
    elements.append(Paragraph("2. Primary Site Architecture", styles['Heading1Custom']))
    
    elements.append(Paragraph(
        "The primary site constitutes the main production facility housing the complete Djezzy SOC Platform in full operational "
        "configuration. This site processes all live security events, hosts active database instances serving analyst queries, "
        "executes real-time alerting logic, performs automated threat detection, and provides the primary user interface for "
        "security operations personnel. The primary site infrastructure comprises fourteen (14) physical servers arranged across "
        "five functional clusters, interconnected via a high-performance spine-leaf switching fabric with dedicated management "
        "and out-of-band administration networks physically separated from data plane traffic.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("2.1 Server Inventory - Primary Site", styles['Heading2Custom']))
    
    # Complete server specifications table
    server_data = [
        ['#', 'Server Role', 'Qty', 'Processor Specification', 'Memory', 'Primary Storage', 'Network Interfaces'],
        ['1', 'SIEM Master Nodes\n(Wazuh/Elasticsearch Master)', '2', 'Dual Intel Xeon Gold\n6348 (28C/56T)\n2.6GHz base, 3.5GHz turbo', '512GB DDR4\n3200MHz ECC\nRDIMM (8x64GB)', '2x 960GB NVMe\nRAID 1 (OS)\n+ 2x 1.92TB NVMe\nRAID 1 (Logs)', '2x 25GbE SFP28\n(Data)\n1x 10GbE BASE-T\n(Mgmt)\n1x 1GbE IPMI'],
        ['2', 'Elasticsearch Data Nodes\n(Hot/Warm Tiers)', '4', 'Dual Intel Xeon Gold\n6348 (28C/56T)\n2.6GHz base, 3.5GHz turbo', '512GB DDR4\n3200MHz ECC\nRDIMM (8x64GB)', '8x 7.68TB NVMe U.3\nRAID 10 (~27TB usable\nper node)', '2x 25GbE SFP28\n(Data)\n1x 10GbE BASE-T\n(Mgmt)\n1x 1GbE IPMI'],
        ['3', 'Database Cluster\n(PostgreSQL/Kafka/Redis)', '3', 'Dual Intel Xeon Silver\n4314 (32C/64T)\n2.4GHz base, 3.4GHz turbo', '384GB DDR4\n3200MHz ECC\nRDIMM (12x32GB)', '4x 3.84TB NVMe\nRAID 10 (DB data)\n+ 4x 3.84TB NVMe\nRAID 10 (Kafka logs)\n+ 2x 960GB NVMe\nRAID 1 (Redis)', '2x 25GbE SFP28\n(Data)\n1x 10GbE BASE-T\n(Mgmt)\n1x 1GbE IPMI'],
        ['4', 'NSM/Packet Capture\n(Suricata/Zeek/Arkime)', '2', 'Dual Intel Xeon Gold\n6248R (20C/40T)\n3.0GHz base, 4.1GHz turbo', '256GB DDR4\n3200MHz ECC\nRDIMM (8x32GB)', '2x 960GB NVMe\nRAID 1 (OS/Cache)\n+ 6x 3.84TB NVMe\nRAID 10 (PCAP)\n(~10TB usable)', '2x 100GbE QSFP28\n(Packet Capture)\n1x 25GbE SFP28\n(Data Export)\n1x 1GbE IPMI'],
        ['5', 'Application Services\n(SOAR/ThreatIntel/Vuln/API)', '2', 'Single Intel Xeon Gold\n6230 (20C/40T)\n2.1GHz base, 3.2GHz turbo', '128GB DDR4\n3200MHz ECC\nRDIMM (4x32GB)', '2x 480GB NVMe\nRAID 1 (OS/Apps)', '2x 25GbE SFP28\n(Data)\n1x 10GbE BASE-T\n(Mgmt)\n1x 1GbE IPMI'],
        ['6', 'Archive/Backup Server\n(Long-term Retention)', '1', 'Dual Intel Xeon Silver\n4310 (12C/24T)\n2.1GHz base, 3.0GHz turbo', '128GB DDR4\n3200MHz ECC\nRDIMM (4x32GB)', '2x 960GB NVMe\nRAID 1 (OS)\n+ 24x 16TB Enterprise SAS\nRAID 6 (~300TB usable)', '2x 25GbE SFP28\n(Backup Network)\n1x 10GbE BASE-T\n(Mgmt)\n1x 1GbE IPMI'],
    ]
    
    server_table = Table(server_data, colWidths=[18, 80, 22, 115, 80, 95, 80])
    server_table.setStyle(create_table_style())
    elements.append(server_table)
    elements.append(Paragraph("Table 2.1: Primary Site Complete Server Specifications", styles['Caption']))
    
    elements.append(Paragraph("2.2 Detailed Component Analysis", styles['Heading2Custom']))
    
    elements.append(Paragraph("2.2.1 SIEM Master Nodes (2 servers)", styles['Heading3Custom']))
    elements.append(Paragraph(
        "The SIEM master nodes serve as the coordination layer for the entire security information and event management stack. Each "
        "node runs Wazuh manager instances responsible for agent registration, rule evaluation, and alert generation across the monitored "
        "environment. Additionally, these nodes host Elasticsearch master-eligible nodes that manage cluster state, index metadata, and shard "
        "allocation decisions. The Kibana visualization platform deploys behind a load balancer distributing analyst queries across both nodes, "
        "ensuring continued dashboard availability during single-node maintenance events. Processor selection prioritizes single-thread performance "
        "critical for Elasticsearch aggregation operations and Wazuh rule engine throughput. Memory allocation provides ample heap space for "
        "Elasticsearch JVM (30GB per node), Wazuh process memory (8GB), and operating system filesystem cache to accelerate frequent index segment access.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("2.2.2 Elasticsearch Data Nodes (4 servers)", styles['Heading3Custom']))
    elements.append(Paragraph(
        "Elasticsearch data nodes constitute the storage and query engine backbone of the SIEM platform, hosting the actual indexed security "
        "event data served to analyst queries. The four-node configuration provides both high availability through replica distribution and "
        "horizontal query scaling as concurrent user load increases. Each node contributes approximately twenty-seven terabytes of usable storage "
        "in RAID 10 arrays delivering over one hundred thousand random read IOPS and eighty thousand random write IOPS, sufficient to maintain "
        "sub-second query response times even during intensive investigation sessions involving complex aggregations across billions of events. "
        "Storage is partitioned into hot tier (SSD, seven-day retention with highest query performance), warm tier (SSD, thirty-day retention "
        "with slightly elevated latency), and frozen tier (automatically migrated to archive server based on index lifecycle policies). Memory "
        "configuration allocates sixty percent to Elasticsearch heap, twenty percent to operating system page cache for segment file buffering, "
        "and twenty percent reserved for other system processes and kernel structures.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("2.2.3 Database Cluster Nodes (3 servers)", styles['Heading3Custom']))
    elements.append(Paragraph(
        "The database cluster provides persistent storage for structured data including security case records (TheHive), threat intelligence "
        "observations (MISP/OpenCTI), vulnerability findings (DefectDojo), subscriber profiles, CDR correlation results, and platform configuration "
        "state. PostgreSQL 16 deploys in streaming replication topology with one primary accepting writes and two hot standbies capable of immediate "
        "promotion upon primary failure. PgBouncer connection pooling sits between application containers and database instances, maximizing "
        "connection efficiency for the containerized microservices architecture generating thousands of concurrent database connections. Kafka "
        "brokers co-located on these nodes benefit from the same high-performance NVMe storage subsystem, with dedicated logical volumes isolating "
        "Kafka log segments from PostgreSQL data files to prevent I/O contention between sequential write (Kafka) and random access (PostgreSQL) patterns.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("2.2.4 NSM/Packet Capture Nodes (2 servers)", styles['Heading3Custom']))
    elements.append(Paragraph(
        "Network Security Monitoring nodes represent the most performance-critical infrastructure components, responsible for capturing, parsing, "
        "and analyzing network traffic at line rate without packet loss. Each node features dual 100 Gigabit Ethernet interfaces configured in "
        "active-active bond, receiving mirrored traffic from core routerSPAN ports or network tap devices. Suricata intrusion detection engine "
        "processes packets using multi-threaded architecture distributing flow analysis across available CPU cores, while Zeek (formerly Bro) "
        "performs deep protocol parsing extracting application-layer intelligence for security-relevant protocol analysis. Captured PCAP files "
        "stream to Arkime (formerly Moloch) for indexed packet-level retrieval enabling investigators to reconstruct individual sessions, extract "
        "file transfers, and visualize communication patterns. The ten terabytes of local PCAP storage per node retains approximately forty-eight "
        "hours of full-packet capture at 50Gbps average utilization before rotation, with older captures migrated to the archive server for "
        "longer retention subject to storage capacity and investigative requirements.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("2.3 Storage Architecture Details", styles['Heading2Custom']))
    
    # Storage breakdown table
    storage_data = [
        ['Service Component', 'Storage Type', 'Raw Capacity', 'Usable (RAID)', 'IOPS Target', 'Retention Period'],
        ['Elasticsearch Hot Tier', 'NVMe U.3 RAID 10', '240 TB (4x60TB)', '~108 TB', '100K+ random R/W', '7 days (active)'],
        ['Elasticsearch Warm Tier', 'NVMe U.3 RAID 10', '120 TB (2x60TB)', '~54 TB', '75K+ random R/W', '30 days (frequent)'],
        ['PostgreSQL Database', 'NVMe RAID 10', '46 TB (3x15.4TB)', '~20 TB', '25K+ random R/W', 'Online (permanent)'],
        ['Kafka Event Log', 'NVMe RAID 10', '46 TB (3x15.4TB)', '~20 TB', '75K+ seq write', '14 days (configurable)'],
        ['Redis Cache Layer', 'NVMe RAID 1', '6 TB (3x2TB)', '~3 TB', '200K+ random R/W', 'Volatile (cache)'],
        ['PCAP Capture (Active)', 'NVMe RAID 10', '120 TB (2x60TB)', '~54 TB', '50K+ seq write', '48 hours (hot)'],
        ['PCAP Archive', 'SAS HDD RAID 6', '384 TB (24x16TB)', '~300 TB', '2K+ seq write', '90 days (extended)'],
        ['OS/System Volumes', 'NVMe RAID 1', '28 TB (14x2TB)', '~14 TB', 'Standard', 'N/A'],
        ['Backup Repository', 'SAS HDD RAID 6', '384 TB (dedicated)', '~300 TB', '2K+ seq write', '365 days (rotating)'],
    ]
    
    storage_table = Table(storage_data, colWidths=[95, 80, 75, 70, 75, 85])
    storage_table.setStyle(create_table_style())
    elements.append(storage_table)
    elements.append(Paragraph("Table 2.2: Complete Storage Allocation Matrix", styles['Caption']))
    
    return elements


def build_disaster_recovery_site(styles):
    """Build disaster recovery site section"""
    elements = []
    
    elements.append(Paragraph("3. Disaster Recovery Site Architecture", styles['Heading1Custom']))
    
    elements.append(Paragraph(
        "The disaster recovery (DR) site provides geographic redundancy ensuring business continuity when the primary site becomes unavailable "
        "due to natural disasters, facility-wide power failures, extended cooling outages, network provider disruptions, or other catastrophic "
        "events affecting the primary location. The DR site operates in hot-standby configuration with all services pre-deployed and synchronized "
        "via asynchronous replication, enabling rapid failover without requiring software installation, configuration, or data restoration "
        "procedures during emergency conditions. Site separation distance exceeds one hundred kilometers to provide meaningful protection against "
        "regional disasters while remaining within Algeria's national boundaries to satisfy data sovereignty requirements.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("3.1 DR Site Server Inventory", styles['Heading2Custom']))
    
    # DR server specifications
    dr_server_data = [
        ['#', 'Server Role', 'Qty', 'Processor', 'Memory', 'Storage', 'Purpose'],
        ['1', 'DR SIEM/Analytics', '2', 'Dual Xeon Gold 5318Y\n(24C/48T)', '256GB DDR4', '4x 3.84TB NVMe\nRAID 10 +\n2x 960GB OS', 'Standby ES/Kibana/\nWazuh managers'],
        ['2', 'DR Database', '2', 'Dual Xeon Silver 4314\n(32C/64T)', '192GB DDR4', '4x 3.84TB NVMe\nRAID 10', 'Standby PG/Kafka\nreplicas'],
        ['3', 'DR Application', '2', 'Single Xeon 6230\n(20C/40T)', '64GB DDR4', '2x 480GB NVMe\nRAID 1', 'Standby SOAR/Threat\nIntel/Vuln apps'],
        ['4', 'DR Archive/Restore', '1', 'Dual Xeon 4310\n(12C/24T)', '96GB DDR4', '12x 16TB SAS\nRAID 6 +\n2x 960GB NVMe', 'Replicated archive\nrestore target'],
        ['5', 'DR Management/Gateway', '1', 'Single Xeon 4314\n(16C/32T)', '32GB DDR4', '2x 240GB SSD\nRAID 1', 'VPN concentrator,\nbastion host, monitoring'],
    ]
    
    dr_server_table = Table(dr_server_data, colWidths=[18, 80, 22, 85, 65, 85, 95])
    dr_server_table.setStyle(create_table_style())
    elements.append(dr_server_table)
    elements.append(Paragraph("Table 3.1: Disaster Recovery Site Server Specifications", styles['Caption']))
    
    elements.append(Paragraph("3.2 Replication Architecture", styles['Heading2Custom']))
    
    elements.append(Paragraph(
        "Data synchronization between primary and DR sites employs multiple replication mechanisms tailored to the consistency and latency "
        "requirements of each data type. For the Elasticsearch security event indices, Cross-Cluster Replication (CCR) continuously pulls new "
        "documents from the primary cluster to the DR cluster with configurable follower lag tolerance typically set to fifteen seconds maximum "
        "under normal network conditions. PostgreSQL database replication utilizes asynchronous streaming replication with WAL shipping, "
        "achieving RPO of approximately five seconds when inter-site connectivity is operational. Kafka topics replicate via MirrorMaker 2 "
        "(or native Kafka ReplicaLink in newer versions) maintaining topic offset synchronization that enables consumer groups to resume "
        "processing at the correct position following failover with minimal message duplication or loss.",
        styles['CustomBody']
    ))
    
    # Replication details table
    repl_data = [
        ['Data Type', 'Replication Method', 'RPO Target', 'Bandwidth Req', 'Failover Action'],
        ['Security Events (ES)', 'Cross-Cluster Replication', '< 15 min', '~500 Mbps avg', 'Promote follower index,\nredirect queries'],
        ['PostgreSQL Database', 'Streaming Replication (async)', '< 5 min', '~100 Mbps avg', 'pg_ctl promote,\nupdate DNS/VIP'],
        ['Kafka Event Topics', 'MirrorMaker 2 / ReplicaLink', '< 10 min', '~200 Mbps avg', 'Consumer offset sync,\nrestart consumers'],
        ['Configuration (GitOps)', 'Git repository push mirror', '< 1 min', '< 1 Mbps', 'Git pull, apply configs'],
        ['Container Images', 'Registry push replication', '< 30 min', '~50 Mbps (initial)', 'Local registry already synced'],
        ['PCAP Archives', 'Async rsync / object sync', '< 1 hour', '~1 Gbps peak', 'Accept gap, resume capture'],
        ['Secrets/Credentials', 'Vault replication / HSM sync', '< 5 min', '< 1 Mbps', 'Standby Vault unseal'],
    ]
    
    repl_table = Table(repl_data, colWidths=[95, 110, 60, 75, 130])
    repl_table.setStyle(create_table_style())
    elements.append(repl_table)
    elements.append(Paragraph("Table 3.2: Inter-Site Replication Configuration", styles['Caption']))
    
    elements.append(Paragraph("3.3 Failover Procedures", styles['Heading2Custom']))
    
    elements.append(Paragraph(
        "Disaster recovery failover follows documented runbook procedures executed by trained operations personnel (or automatically via "
        "orchestrated workflows if implemented). Upon detection of primary site failure exceeding predefined thresholds (typically five minutes "
        "of complete unreachability for critical services), the incident commander declares disaster recovery activation. Automated health "
        "check scripts verify DR site service status and data currency, confirming replication lag falls within acceptable bounds for each "
        "critical data store. Database promotion executes via pre-configured automation promoting the warm standby to primary role, while "
        "DNS updates (or VIP migration via anycast routing) redirect client traffic to the DR site IP addresses. Target failover time from "
        "declaration to full service availability is thirty minutes for Tier-1 services (event ingestion, alerting, basic search) and sixty "
        "minutes for Tier-2 services (full analytical capabilities, historical search, case management).",
        styles['CustomBody']
    ))
    
    failover_steps = [
        "Verify primary site outage through multiple independent confirmation channels",
        "Activate DR site operations room and assemble response team (virtual or physical)",
        "Execute automated health verification scripts confirming DR service readiness",
        "Review replication lag reports for all critical data stores against RPO targets",
        "Obtain formal authorization from designated incident commander for failover execution",
        "Execute database promotion sequence (PostgreSQL promote, ES index promotion)",
        "Update DNS records or migrate anycast VIPs to point to DR site addresses",
        "Validate end-to-end functionality through synthetic transaction testing",
        "Communicate status update to stakeholders including degraded capability notices",
        "Monitor DR site performance closely during initial hours post-failover",
        "Document timeline and lessons learned for post-incident review"
    ]
    
    for step in failover_steps:
        elements.append(Paragraph(f"<bullet>&bull;</bullet> {step}", styles['BulletText']))
    
    return elements


def build_network_infrastructure(styles):
    """Build network infrastructure section"""
    elements = []
    
    elements.append(Paragraph("4. Network Infrastructure Design", styles['Heading1Custom']))
    
    elements.append(Paragraph(
        "Network infrastructure for the Djezzy SOC Platform implements a defense-in-depth architecture combining physical segmentation, "
        "logical isolation, encrypted communications, and comprehensive monitoring visibility. The design accommodates the extreme throughput "
        "requirements of line-rate packet capture while providing robust connectivity between containerized microservices with predictable "
        "latency characteristics essential for real-time security analytics. All network equipment resides within Djezzy facilities with "
        "no dependency on external connectivity providers for internal platform operation.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("4.1 Network Segmentation Zones", styles['Heading2Custom']))
    
    # Network zones table
    zone_data = [
        ['Zone Name', 'CIDR Range', 'VLAN ID', 'Purpose', 'Connected Components', 'Security Level'],
        ['soc-management', '172.16.0.0/16', 'VLAN 100', 'OOB admin, IPMI,\ndevice management', 'Switch mgmt, IPMI,\nBastion hosts', 'CRITICAL - Isolated'],
        ['soc-frontend', '172.28.0.0/16', 'VLAN 200', 'User-facing apps,\nAPI gateway, dashboards', 'Next.js, Kong GW,\nGrafana, Analyst VPN', 'RESTRICTED - Auth required'],
        ['soc-backend', '172.29.0.0/16', 'VLAN 300', 'Core services,\nSOAR, Threat Intel', 'TheHive, Cortex, MISP,\nOpenCTI, DefectDojo', 'INTERNAL - Service-to-service'],
        ['soc-events', '172.30.0.0/16', 'VLAN 400', 'Event processing,\nSIEM, Analytics', 'Wazuh, ES, Kafka,\nPostgreSQL, Redis', 'SENSITIVE - High throughput'],
        ['soc-capture', '172.31.0.0/16', 'VLAN 500', 'Packet capture,\nNSM engines', 'Suricata, Zeek,\nArkime, TAPs', 'RESTRICTED - No direct access'],
        ['soc-backup', '172.32.0.0/16', 'VLAN 600', 'Backup traffic,\narchive replication', 'Backup server, DR link,\nNAS/SAN arrays', 'INTERNAL - Bulk transfer'],
        ['soc-monitoring', '172.33.0.0/16', 'VLAN 700', 'Observability,\nmetrics, logging', 'Prometheus, AlertManager,\nLog aggregation', 'INTERNAL - Ops team only'],
    ]
    
    zone_table = Table(zone_data, colWidths=[75, 70, 45, 90, 105, 95])
    zone_table.setStyle(create_table_style())
    elements.append(zone_table)
    elements.append(Paragraph("Table 4.1: Network Zone Segmentation Scheme", styles['Caption']))
    
    elements.append(Paragraph("4.2 Switching Fabric Topology", styles['Heading2Custom']))
    
    elements.append(Paragraph(
        "The primary site network employs spine-leaf architecture providing non-blocking bisectional bandwidth between any pair of endpoints "
        "while minimizing hop count and deterministic latency paths. Two spine switches form the aggregation layer connecting all leaf switches "
        "in full-mesh topology with 100 Gigabit Ethernet links. Leaf switches provide server-facing ports at appropriate speeds matching each "
        "server role's requirements: 100GbE for NSM capture nodes, 25GbE for Elasticsearch and database nodes, and 10GbE for management and "
        "application servers. This hierarchical design simplifies operations by eliminating spanning tree protocols (using ECMP routing instead), "
        "provides easy capacity addition through leaf spin-up, and contains failure domains to individual leaf switches affecting only directly "
        "attached servers rather than causing fabric-wide disruption.",
        styles['CustomBody']
    ))
    
    # Switch inventory table
    switch_data = [
        ['Device Role', 'Model Example', 'Port Configuration', 'Uplink/Downlink', 'Quantity', 'Redundancy'],
        ['Spine Switch', 'Cisco Nexus 9504\nw/ 9700-48X linecard', '48x 100GbE QSFP28\n+ 6x 400GbE QSFP-DD', 'Spine-Spine: 400GbE\nSpine-Leaf: 100GbE', '2', 'N+1 (one spare)'],
        ['Leaf (Capture)', 'Cisco Nexus 9364CD\nArista 7280R3', '48x 25GbE SFP28\n+ 8x 100GbE QSFP28', 'Down: 25/100GbE\nUp: 100GbE to Spine', '2', 'Paired (A/B)'],
        ['Leaf (Compute)', 'Cisco Nexus 9364C\nArista 7050X3', '48x 25GbE SFP28\n+ 8x 100GbE QSFP28', 'Down: 25GbE\nUp: 100GbE to Spine', '2', 'Paired (A/B)'],
        ['Leaf (Storage)', 'Cisco Nexus 9364C\nArista 7050X3', '48x 25GbE SFP28\n+ 8x 100GbE QSFP28', 'Down: 25GbE\nUp: 100GbE to Spine', '1', 'N+1 (spare port)'],
        ['Management', 'Cisco Catalyst 9300-48T\nJuniper EX4300-48T', '48x 1GbE/10GbE BASE-T\n+ 4x 10GbE SFP+', 'Down: 1/10GbE\nUp: 10GbE to Mgmt Core', '2', 'N+1 redundant'],
        ['Out-of-Band', 'Cisco Catalyst 9200\nLantronix SLC8000', '48x 1GbE\nSerial console', 'IPMI/Console only', '1', 'Standalone OK'],
    ]
    
    switch_table = Table(switch_data, colWidths=[70, 95, 95, 85, 45, 70])
    switch_table.setStyle(create_table_style())
    elements.append(switch_table)
    elements.append(Paragraph("Table 4.2: Network Switch Inventory and Specifications", styles['Caption']))
    
    elements.append(Paragraph("4.3 Inter-Site Connectivity", styles['Heading2Custom']))
    
    elements.append(Paragraph(
        "Connectivity between primary and disaster recovery sites utilizes diverse path fiber circuits provisioned from two different "
        "telecommunications carriers to eliminate single point of failure in the transport layer. Primary circuit provides ten Gigabit "
        "Ethernet bandwidth sufficient for continuous asynchronous replication of all critical data stores under normal operation. Secondary "
        "circuit offers two Gigabit Ethernet capacity serving as automatic failover path should the primary circuit degrade or fail. Both "
        "circuits terminate on carrier-grade routers at each site running BGP for dynamic path selection, with encryption applied via "
        "IPsec tunnels protecting all inter-site traffic confidentiality and integrity. During normal operations, replication traffic consumes "
        "approximately six to eight Gigabits of the primary circuit capacity, leaving headroom for administrative access and emergency "
        "bulk transfers. Circuit diversity ensures that fiber cuts, carrier maintenance windows, or provider outages affect only one path "
        "without disrupting replication continuity.",
        styles['CustomBody']
    ))
    
    # Inter-site connectivity table
    intersite_data = [
        ['Circuit Attribute', 'Primary Link', 'Secondary Link'],
        ['Provider', 'Algerie Telecom (example)', 'Djezzi (alternative carrier)'],
        ['Bandwidth', '10 Gbps Ethernet', '2 Gbps Ethernet'],
        ['Technology', 'DWDM dark fiber / MPLS', 'Dedicated leased line'],
        ['Latency (RTD)', '< 5ms (< 150km path)', '< 8ms (diverse route)'],
        ['Encryption', 'AES-256 IPsec tunnel', 'AES-256 IPsec tunnel'],
        ['Routing Protocol', 'BGP with local pref', 'BGP (lower preference)'],
        ['Primary Use', 'DB/ES/Kafka replication', 'Admin access, backup overflow'],
        ['SLA Availability', '99.99% (52 min/yr downtime)', '99.9% (8.7 hr/yr downtime)'],
    ]
    
    intersite_table = Table(intersite_data, colWidths=[120, 175, 175])
    intersite_table.setStyle(create_table_style())
    elements.append(intersite_table)
    elements.append(Paragraph("Table 4.3: Inter-Site WAN Circuit Specifications", styles['Caption']))
    
    return elements


def build_physical_facilities(styles):
    """Build physical facilities and environmental requirements"""
    elements = []
    
    elements.append(Paragraph("5. Physical Facility Requirements", styles['Heading1Custom']))
    
    elements.append(Paragraph(
        "Successful operation of the Djezzy SOC Platform requires physical facility infrastructure meeting specific power, cooling, space, "
        "and environmental standards. This section outlines requirements for both primary and disaster recovery sites, providing guidance for "
        "facility managers and data center planners preparing to host the platform hardware. Organizations with existing data center facilities "
        "should assess current capabilities against these requirements to identify necessary upgrades or expansions prior to equipment installation.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("5.1 Power Requirements", styles['Heading2Custom']))
    
    # Power requirements table
    power_data = [
        ['Component Category', 'Quantity', 'Avg Draw (kW)', 'Peak Draw (kW)', 'Total Avg (kW)', 'Total Peak (kW)'],
        ['SIEM Master Servers', '2', '0.8 kW', '1.2 kW', '1.6 kW', '2.4 kW'],
        ['Elasticsearch Data Nodes', '4', '1.0 kW', '1.5 kW', '4.0 kW', '6.0 kW'],
        ['Database Cluster Nodes', '3', '0.9 kW', '1.4 kW', '2.7 kW', '4.2 kW'],
        ['NSM/Capture Nodes', '2', '1.2 kW', '1.8 kW', '2.4 kW', '3.6 kW'],
        ['Application Servers', '2', '0.5 kW', '0.8 kW', '1.0 kW', '1.6 kW'],
        ['Archive/Backup Server', '1', '0.7 kW', '1.1 kW', '0.7 kW', '1.1 kW'],
        ['Network Switches (all)', '12', '0.3 kW', '0.5 kW', '3.6 kW', '6.0 kW'],
        ['Storage Arrays (SAN/NAS)', '2', '1.5 kW', '2.5 kW', '3.0 kW', '5.0 kW'],
        ['UPS Systems (overhead)', '-', '-', '-', '2.0 kW', '3.0 kW'],
        ['Cooling (PUE factor 1.5)', '-', '-', '-', '21.0 kW', '33.0 kW'],
        ['TOTAL PRIMARY SITE', '-', '-', '-', '~42 kW', '~66 kW'],
    ]
    
    power_table = Table(power_data, colWidths=[100, 50, 65, 65, 70, 70])
    power_table.setStyle(create_table_style())
    elements.append(power_table)
    elements.append(Paragraph("Table 5.1: Primary Site Power Budget Estimate", styles['Caption']))
    
    elements.append(Paragraph(
        "Power infrastructure must deliver the calculated peak capacity with N+1 redundancy at minimum, meaning UPS and power distribution "
        "systems should be rated for at least seventy-five kilowatts to accommodate the sixty-six kilowatt peak load with headroom for "
        "transient spikes and future growth. Dual-feed configurations connect each server to separate power distribution units (PDUs) fed "
        "from independent UPS systems, themselves connected to separate utility feeds or generator sources where available. Automatic transfer "
        "switches (ATS) handle failover between utility and generator power within ten milliseconds, preventing server reboot during power "
        "source transitions. Battery runtime should sustain full load for minimum fifteen minutes allowing orderly graceful shutdown or "
        "generator start-up completion for extended outages.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("5.2 Cooling Requirements", styles['Heading2Custom']))
    
    elements.append(Paragraph(
        "Cooling infrastructure must remove approximately forty-two kilowatts of continuous heat load (sixty-six kilowatts peak) from the "
        "primary site equipment footprint while maintaining ASHRAE-recommended environmental parameters for IT equipment operation. Recommended "
        "supply air temperature ranges from eighteen to twenty-seven degrees Celsius with relative humidity between forty and sixty percent "
        "non-condensing. Hot aisle/cold aisle containment strongly recommended to prevent recirculation mixing and improve cooling efficiency. "
        "Precision air conditioning units (CRAC or CRAH) with variable speed fans and economizer modes reduce energy consumption during cooler "
        "ambient periods. Redundant cooling units (N+1 configuration) ensure continued operation during single-unit maintenance or failure scenarios.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("5.3 Space Requirements", styles['Heading2Custom']))
    
    # Space requirements table
    space_data = [
        ['Item', 'Quantity', 'RU Height', 'Footprint (sq meters)', 'Notes'],
        ['Server (2U each)', '14 servers', '28 RU', '2.8 sq m', 'Standard 19" rack mount'],
        ['Switches (1U each)', '12 switches', '12 RU', '1.2 sq m', 'Includes spares'],
        ['Storage Arrays', '2 units', '14 RU', '1.4 sq m', 'SAN/NAS enclosures'],
        ['UPS Systems', '2 units', '10 RU', '2.0 sq m', 'Battery cabinets adjacent'],
        ['PDU/Power', '8 units', '4 RU', '-Mounted', 'Zero-U or 1U PDUs'],
        ['Patch Panels/Cabling', '-', '8 RU', '-Mounted', 'Fiber/copper management'],
        ['Cable Management', '-', '4 RU', '-Mounted', 'Horizontal/vertical managers'],
        ['Total Equipment', '-', '78 RU', '7.4 sq m', 'Excluding clearance'],
        ['Recommended Rack Count', '4 racks (42U each)', '168 RU total', '12 sq m incl. clearance', '~50% utilization for airflow'],
    ]
    
    space_table = Table(space_data, colWidths=[100, 65, 60, 95, 140])
    space_table.setStyle(create_table_style())
    elements.append(space_table)
    elements.append(Paragraph("Table 5.2: Physical Space Requirements", styles['Caption']))
    
    elements.append(Paragraph("5.4 Physical Security Requirements", styles['Heading2Custom']))
    
    elements.append(Paragraph(
        "Given the sensitive nature of security operations data and the national critical infrastructure context, physical security controls "
        "must meet or exceed industry best practices for data center facilities. Access control requires multi-factor authentication (badge + "
        "PIN/biometric) at building entry, with additional badge authentication at computer room entrance. CCTV surveillance with ninety-day "
        "retention covers all entry points, aisles, and equipment rows. Visitor escort mandatory for all non-authorized personnel. Environmental "
        "monitoring sensors detect water leaks, smoke, temperature excursions, and humidity anomalies with automated alerting to operations "
        "center and facilities management. Fire suppression uses clean agent systems (FM-200, Novec 1230, or inert gas) suitable for electronic "
        "equipment protection without water damage risk.",
        styles['CustomBody']
    ))
    
    return elements


def build_implementation_phases(styles):
    """Build implementation phases and timeline"""
    elements = []
    
    elements.append(Paragraph("6. Implementation Roadmap", styles['Heading1Custom']))
    
    elements.append(Paragraph(
        "Implementation follows a structured phased approach spanning approximately eight months from project kickoff to full production "
        "operation with validated disaster recovery capabilities. Each phase builds upon previous deliverables, reducing integration risk "
        "through incremental validation and creating natural decision points for go/no-go progression assessments. The timeline assumes "
        "availability of dedicated project resources including infrastructure engineers, security architects, network specialists, and "
        "operations personnel allocated sufficiently to execute parallel workstreams where the plan indicates concurrent activities.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("6.1 Phase Overview", styles['Heading2Custom']))
    
    # Phase summary table
    phase_data = [
        ['Phase', 'Duration', 'Focus Area', 'Key Deliverables', 'Exit Criteria'],
        ['Phase 1:\nFacility Prep', 'Weeks 1-4', 'Physical infrastructure\nreadiness', 'Power, cooling, racking,\ncabling complete', 'Facility inspection pass,\npower test successful'],
        ['Phase 2:\nBase Platform', 'Weeks 5-8', 'Core infrastructure\nservices', 'OS deployed, Docker running,\nnetwork validated', 'All nodes reachable,\ndocker-compose starts'],
        ['Phase 3:\nData Layer', 'Weeks 9-12', 'Databases, messaging,\nsearch engine', 'PG, Kafka, ES clusters\noperational', 'Smoke tests pass,\nreplication working'],
        ['Phase 4:\nSecurity Tools', 'Weeks 13-18', '15 open-source tools\ndeployed & integrated', 'All tools receiving data,\ncross-tool workflows', 'Integration tests pass,\nalerts generating'],
        ['Phase 5:\nApp Layer', 'Weeks 19-21', 'Frontend, API, auth,\nworkflow automation', 'Full UI accessible,\nauth enforced', 'UAT sign-off from\npilot users'],
        ['Phase 6:\nTesting/Hardening', 'Weeks 22-25', 'Load test, pen test,\nfailure simulation', 'Validated performance,\nhardened config', 'All tests green,\nrunbooks complete'],
        ['Phase 7:\nDR Setup', 'Weeks 26-29', 'DR site deploy,\nreplication setup', 'DR site operational,\ndata syncing', 'DR drill successful,\nRTO/RPO met'],
        ['Phase 8:\nGo-Live', 'Weeks 30-33', 'Production cutover,\nhypercare support', 'Live traffic flowing,\nops team trained', '7-day stability,\nhandoff complete'],
    ]
    
    phase_table = Table(phase_data, colWidths=[60, 55, 80, 115, 110])
    phase_table.setStyle(create_table_style())
    elements.append(phase_table)
    elements.append(Paragraph("Table 6.1: Implementation Phase Summary", styles['Caption']))
    
    elements.append(Paragraph("6.2 Phase 1 Detail: Facility Preparation (Weeks 1-4)", styles['Heading2Custom']))
    
    phase1_items = [
        "Complete hardware procurement and receive all server, storage, networking equipment at primary site",
        "Install equipment in designated rack positions according to rack elevation diagrams",
        "Terminate fiber optic cables for 100GbE/25GbE data connections with proper testing",
        "Terminate copper cabling for 10GbE/1GbE management and out-of-band networks",
        "Configure UPS systems and validate automatic transfer switch operation via simulated failover test",
        "Deploy base operating system (Rocky Linux 9.4 or Ubuntu 22.04 LTS) on all fourteen primary site servers",
        "Install container runtime (Docker CE 27.x or Podman 5.x) and configure daemon.json settings",
        "Establish VLAN trunking from switches to server NICs according to network segmentation design",
        "Configure bonded network interfaces (LACP 802.3ad) for all multi-homed server connections",
        "Validate network throughput meets specifications using iperf3 at expected frame sizes",
        "Configure centralized logging (rsyslog forwarding to log aggregator) and chrony NTP synchronization",
        "Document all asset details (serial numbers, MAC addresses, IP addresses, rack positions) in CMDB",
        "Conduct physical security audit verifying access control, CCTV coverage, environmental sensors"
    ]
    
    for item in phase1_items:
        elements.append(Paragraph(f"<bullet>&bull;</bullet> {item}", styles['BulletText']))
    
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("6.3 Phase 2-4 Detail: Platform and Tool Deployment (Weeks 5-18)", styles['Heading2Custom']))
    
    elements.append(Paragraph(
        "Phases two through four encompass the technical heavy lifting of platform deployment, progressing from bare metal through "
        "containerized service orchestration to fully integrated security tooling. Phase two establishes the foundation: operating system "
        "hardening (CIS benchmarks), container runtime configuration, network bridge creation for each VLAN, and validation of docker-compose "
        "orchestration successfully scheduling containers across the cluster. Phase three deploys the data layer services: PostgreSQL cluster "
        "with PgBouncer, Apache Kafka with ZooKeeper, Elasticsearch cluster with Kibana, and Redis cache instances. Phase three concludes "
        "with data pipeline smoke tests confirming event flow from simulated sources through Kafka into Elasticsearch with searchable indices. "
        "Phase four introduces the fifteen security tools in dependency order, validating integration points between adjacent tools and "
        "confirming data flows match architectural expectations.",
        styles['CustomBody']
    ))
    
    # Tools deployment sequence
    tools_seq_data = [
        ['Week', 'Deployment Focus', 'Tools/Components', 'Validation Checkpoint'],
        ['9-10', 'SIEM Foundation', 'Wazuh Manager, Elasticsearch Master, Kibana', 'Agent registers, index creates, dashboard renders'],
        ['10-11', 'Event Pipeline', 'Wazuh Indexer, Kafka topics, Log shippers', 'Events flow end-to-end, alerts generate'],
        ['11-12', 'NSM Engines', 'Suricata IDS, Zeek/Bro NSM, File extraction', 'Rules fire, logs parse, files captured'],
        ['12-13', 'Packet Analysis', 'Arkime/Moloch PCAP viewer, PCAP upload workflow', 'Full packet search works, sessions reconstruct'],
        ['13-14', 'Endpoint (EDR)', 'GRR Rapid Response, Osquery Fleet server', 'Remote forensic access, endpoint queries'],
        ['14-15', 'SOAR Platform', 'TheHive Case Management, Cortex Analyzers', 'Cases create, analyzers respond correctly'],
        ['15-16', 'Threat Intelligence', 'MISP Threat Sharing, OpenCTI Platform', 'IOCs import, enrichment works, graphs render'],
        ['16-17', 'Vulnerability', 'OpenVAS/GVM Scanner, DefectDojo VM', 'Scans launch, findings import, reports generate'],
        ['17-18', 'Observability', 'Prometheus, Grafana, AlertManager, dashboards', 'Metrics collect, alerts fire, dashboards populate'],
    ]
    
    tools_seq_table = Table(tools_seq_data, colWidths=[40, 90, 165, 170])
    tools_seq_table.setStyle(create_table_style())
    elements.append(tools_seq_table)
    elements.append(Paragraph("Table 6.2: Security Tool Deployment Sequence", styles['Caption']))
    
    elements.append(Paragraph("6.4 Phase 5-6 Detail: Application, Testing, Hardening (Weeks 19-25)", styles['Heading2Custom']))
    
    elements.append(Paragraph(
        "Phase five deploys the custom Next.js 16 frontend application and TypeScript backend APIs implementing telecom-specific business "
        "logic including fraud detection algorithms, CDR correlation engines, and subscriber profiling. Authentication framework activates "
        "during this phase integrating with corporate LDAP directory (or local database fallback for air-gapped deployments) enforcing "
        "role-based access control across all platform functions. User acceptance testing proceeds with pilot analyst groups providing "
        "feedback on workflow usability and feature completeness. Phase six subjects the integrated platform to rigorous testing: load "
        "tests sustaining fifty thousand EPS for minimum twenty-four hours, penetration testing by authorized red team assessing application "
        "and API security posture, failure mode testing simulating node failures and network partitions, and security configuration review "
        "validating TLS certificates, cipher suites, and header hardening meet organizational standards.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("6.5 Phase 7-8 Detail: Disaster Recovery and Go-Live (Weeks 26-33)", styles['Heading2Custom']))
    
    elements.append(Paragraph(
        "Phase seven establishes the disaster recovery site infrastructure mirroring the primary site deployment at reduced scale. DR servers "
        "receive operating system deployment, container runtime installation, and platform service instantiation in standby configuration. "
        "Inter-site replication activates for all critical data stores with continuous monitoring of replication lag metrics. A formal DR "
        "drill exercises complete failover procedures validating that recovery time and point objectives are achievable under controlled "
        "conditions. Phase eight executes production cutover beginning with final data migration from legacy systems (if applicable), gradual "
        "traffic shifting to route live events through the new platform, and formal handoff from project team to operations organization. "
        "The hypercare period (weeks 32-33) maintains augmented staffing with developers on standby to rapidly address any issues discovered "
        "under genuine production load, concluding with transition to steady-state operations and standard change management processes.",
        styles['CustomBody']
    ))
    
    return elements


def build_cost_estimation(styles):
    """Build cost estimation for 100% on-premises deployment"""
    elements = []
    
    elements.append(Paragraph("7. Cost Estimation (100% On-Premises)", styles['Heading1Custom']))
    
    elements.append(Paragraph(
        "This section presents comprehensive cost estimates for deploying and operating the Djezzy SOC Platform entirely on-premises "
        "across two data center sites. Figures represent order-of-magnitude budgetary ranges based on enterprise-grade hardware list pricing "
        "from major vendors (Cisco, Dell EMC, HPE, Supermicro) and industry-standard professional services rates. Actual costs will vary "
        "based on vendor negotiations, geographic pricing variations, existing infrastructure leverage, and organization-specific scope adjustments. "
        "All costs are presented in United States Dollars (USD); organizations should convert to Algerian Dinar (DZD) using current exchange rates "
        "for local budget planning purposes.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("7.1 Capital Expenditure - Primary Site", styles['Heading2Custom']))
    
    # Primary site costs
    primary_cost_data = [
        ['Category', 'Description', 'Unit Cost', 'Qty', 'Total (USD)'],
        ['COMPUTE SERVERS', '', '', '', ''],
        ['SIEM Masters (x2)', 'Dual Xeon 6348, 512GB, 4TB NVMe', '$42,000', '2', '$84,000'],
        ['ES Data Nodes (x4)', 'Dual Xeon 6348, 512GB, 60TB NVMe', '$58,000', '4', '$232,000'],
        ['Database Cluster (x3)', 'Dual Xeon 4314, 384GB, 15TB NVMe', '$38,000', '3', '$114,000'],
        ['NSM Capture (x2)', 'Dual Xeon 6248R, 256GB, 20TB NVMe', '$46,000', '2', '$92,000'],
        ['Application (x2)', 'Single Xeon 6230, 128GB, 1TB NVMe', '$16,000', '2', '$32,000'],
        ['Archive Server (x1)', 'Dual Xeon 4310, 128GB, 384TB SAS', '$35,000', '1', '$35,000'],
        ['NETWORK INFRASTRUCTURE', '', '', '', ''],
        ['Spine Switches (x2)', '100GbE modular chassis', '$82,000', '2', '$164,000'],
        ['Leaf Switches (x5)', '25/100GbE fixed', '$32,000', '5', '$160,000'],
        ['Management Switches (x2)', '10GbE L3 managed', '$11,000', '2', '$22,000'],
        ['Optics & Cabling', 'DAC, AOC, fiber, patch panels', '-', '1', '$28,000'],
        ['STORAGE EXPANSION', '', '', '', ''],
        ['NVMe Drives (spares)', '7.68TB enterprise U.3', '$1,700', '8', '$13,600'],
        ['SAS HDD (archive)', '16TB enterprise SAS', '$420', '24', '$10,080'],
        ['INFRASTRUCTURE', '', '', '', ''],
        ['UPS Systems', '20kVA double-conversion', '$14,000', '2', '$28,000'],
        ['PDU Distribution', 'Switched monitored PDU', '$3,200', '8', '$25,600'],
        ['Rack Enclosures', '42U closed perforated', '$4,200', '4', '$16,800'],
        ['PRIMARY SITE SUBTOTAL', '', '', '', '$1,058,080'],
    ]
    
    primary_cost_table = Table(primary_cost_data, colWidths=[115, 135, 55, 35, 80])
    primary_cost_table.setStyle(create_table_style())
    elements.append(primary_cost_table)
    elements.append(Paragraph("Table 7.1: Primary Site Capital Expenditure Breakdown", styles['Caption']))
    
    elements.append(Paragraph("7.2 Capital Expenditure - Disaster Recovery Site", styles['Heading2Custom']))
    
    # DR site costs
    dr_cost_data = [
        ['Category', 'Description', 'Unit Cost', 'Qty', 'Total (USD)'],
        ['DR COMPUTE SERVERS', '', '', '', ''],
        ['DR SIEM/Analytics (x2)', 'Dual Xeon 5318Y, 256GB, 8TB NVMe', '$28,000', '2', '$56,000'],
        ['DR Database (x2)', 'Dual Xeon 4314, 192GB, 8TB NVMe', '$26,000', '2', '$52,000'],
        ['DR Application (x2)', 'Single Xeon 6230, 64GB, 1TB NVMe', '$14,000', '2', '$28,000'],
        ['DR Archive (x1)', 'Dual Xeon 4310, 96GB, 192TB SAS', '$28,000', '1', '$28,000'],
        ['DR Management (x1)', 'Single Xeon 4314, 32GB, 480GB SSD', '$10,000', '1', '$10,000'],
        ['DR NETWORKING', '', '', '', ''],
        ['DR Switches (x3)', '25/100GbE leaf + mgmt', '$24,000', '3', '$72,000'],
        ['DR Optics/Cabling', 'Fiber, copper, adapters', '-', '1', '$12,000'],
        ['DR INFRASTRUCTURE', '', '', '', ''],
        ['UPS System', '10kVA double-conversion', '$9,000', '1', '$9,000'],
        ['PDU Distribution', 'Switched PDU', '$2,800', '4', '$11,200'],
        ['Rack Enclosures', '42U closed', '$4,200', '2', '$8,400'],
        ['DISASTER RECOVERY SUBTOTAL', '', '', '', '$286,600'],
    ]
    
    dr_cost_table = Table(dr_cost_data, colWidths=[115, 140, 55, 35, 75])
    dr_cost_table.setStyle(create_table_style())
    elements.append(dr_cost_table)
    elements.append(Paragraph("Table 7.2: Disaster Recovery Site Capital Expenditure", styles['Caption']))
    
    elements.append(Paragraph("7.3 Software and Professional Services", styles['Heading2Custom']))
    
    # Software/services costs
    sw_cost_data = [
        ['Category', 'Description', 'Cost (USD)', 'Notes'],
        ['Operating System Licenses', 'RHEL/Rocky Linux subscriptions (16 servers x 3yr)', '$38,400', 'Or use Rocky free alternative'],
        ['Container Runtime Support', 'Docker EE / Podman enterprise (optional)', '$45,000', 'Community editions free'],
        ['Backup Software', 'Enterprise backup suite (Veeam, Commvault)', '$25,000', 'Perpetual + 3yr maintenance'],
        ['Monitoring Suite', 'Datadog/New Relic or self-hosted Prometheus stack', '$15,000', 'Self-hosted option near-zero cost'],
        ['Deployment Services', 'Vendor/partner implementation assistance', '$120,000', '8-week engagement'],
        ['Knowledge Transfer', 'Training program for ops team (certification)', '$35,000', '5-person cohort'],
        ['Project Management', 'PM resources for 8-month duration', '$80,000', '1 FTE dedicated PM'],
        ['Documentation', 'Technical documentation, runbooks, procedures', '$25,000', 'Comprehensive docs package'],
        ['Contingency Reserve', '15% buffer for unforeseen costs', '$218,450', 'Industry standard reserve'],
        ['SOFTWARE & SERVICES TOTAL', '', '$601,850', ''],
    ]
    
    sw_cost_table = Table(sw_cost_data, colWidths=[120, 195, 70, 115])
    sw_cost_table.setStyle(create_table_style())
    elements.append(sw_cost_table)
    elements.append(Paragraph("Table 7.3: Software and Professional Services Costs", styles['Caption']))
    
    elements.append(Paragraph("7.4 Total Investment Summary", styles['Heading2Custom']))
    
    # Grand total
    total_data = [
        ['Investment Category', 'Amount (USD)', 'Percentage'],
        ['Primary Site Infrastructure', '$1,058,080', '53.1%'],
        ['Disaster Recovery Site', '$286,600', '14.4%'],
        ['Software & Licensing', '$123,400', '6.2%'],
        ['Professional Services', '$260,000', '13.0%'],
        ['Contingency Reserve (15%)', '$218,450', '11.0%'],
        ['Contingency Reserve (15%)', '$218,450', '11.0%'],
        ['', '', ''],
        ['TOTAL CAPITAL INVESTMENT', '$1,991,930', '100%'],
    ]
    
    total_table = Table(total_data, colWidths=[180, 100, 100])
    total_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('BACKGROUND', (0, -1), (-1, -1), ACCENT),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTNAME', (0, -1), (-1, -1), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('ROWBACKGROUNDS', (0, 1), (-2, -2), [CARD_BG, TABLE_STRIPE]),
    ]))
    elements.append(total_table)
    elements.append(Paragraph("Table 7.4: Total Capital Investment Summary", styles['Caption']))
    
    elements.append(Paragraph("7.5 Annual Operational Expenditure", styles['Heading2Custom']))
    
    # OpEx
    opex_data = [
        ['Category', 'Annual Cost (USD)', 'Monthly Equivalent', 'Notes'],
        ['Facility - Power (both sites)', '$120,000', '$10,000', '~66kW avg @ $0.10/kWh, 24/7'],
        ['Facility - Cooling (both sites)', '$52,000', '$4,333', 'Estimated 1.5x PUE factor'],
        ['Facility - Colocation/Space', '$72,000', '$6,000', 'If not owned DC (6 racks x $1k/rack/mo)'],
        ['Hardware Maintenance (12%)', '$161,350', '$13,446', '4-hour response, parts included'],
        ['Software Support Renewals', '$41,133', '$3,428', 'OS, backup, optional tools'],
        ['Personnel - Platform Engineers (3 FTE)', '$210,000', '$17,500', '$70k avg fully-loaded salary'],
        ['Consumables - Media Replacement', '$18,000', '$1,500', 'Drive failures, growth'],
        ['Training & Certification (annual)', '$15,000', '$1,250', 'Conferences, courses, certs'],
        ['ANNUAL OPEX TOTAL', '$689,483', '$57,457', 'Excludes analyst personnel'],
    ]
    
    opex_table = Table(opex_data, colWidths=[145, 95, 85, 155])
    opex_table.setStyle(create_table_style())
    elements.append(opex_table)
    elements.append(Paragraph("Table 7.5: Estimated Annual Operational Expenditure", styles['Caption']))
    
    elements.append(Paragraph("7.6 Five-Year Total Cost of Ownership", styles['Heading2Custom']))
    
    # TCO
    tco_data = [
        ['Cost Category', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', '5-Year Total'],
        ['Capital Investment', '$1,991,930', '$0', '$0', '$0', '$0', '$1,991,930'],
        ['Operational Expenditure', '$689,483', '$720,000', '$750,000', '$780,000', '$810,000', '$3,749,483'],
        ['Hardware Refresh (Y3)', '$0', '$0', '$400,000', '$0', '$0', '$400,000'],
        ['Major Upgrade Reserve', '$0', '$100,000', '$0', '$150,000', '$0', '$250,000'],
        ['Annual Total', '$2,681,413', '$820,000', '$1,150,000', '$930,000', '$810,000', '$6,391,413'],
        ['Cumulative Total', '$2,681,413', '$3,501,413', '$4,651,413', '$5,581,413', '$6,391,413', '-'],
    ]
    
    tco_table = Table(tco_data, colWidths=[110, 70, 65, 70, 70, 65, 80])
    tco_table.setStyle(create_table_style())
    elements.append(tco_table)
    elements.append(Paragraph("Table 7.6: Five-Year Total Cost of Ownership Projection", styles['Caption']))
    
    elements.append(Paragraph(
        "The five-year total cost of ownership for the complete 100% on-premises Djezzy SOC Platform deployment approximates **6.4 million USD** "
        "(approximately 8.6 billion DZD at current exchange rates), representing an average annual investment of 1.28 million USD inclusive of "
        "personnel, facilities, maintenance, and periodic technology refresh cycles. This investment positions Djezzy with world-class security "
        "operations capabilities comparable to leading European and Middle Eastern telecommunications operators, while maintaining complete data "
        "sovereignty and operational independence from external service providers or cloud platforms.",
        styles['CustomBody']
    ))
    
    return elements


def build_recommendations(styles):
    """Build recommendations and next steps"""
    elements = []
    
    elements.append(Paragraph("8. Recommendations and Next Steps", styles['Heading1Custom']))
    
    elements.append(Paragraph("8.1 Architecture Recommendation Confirmation", styles['Heading2Custom']))
    
    elements.append(Paragraph(
        "Based on your explicit requirement for 100% on-premises deployment with zero cloud dependencies, this guide presents a fully self-contained "
        "hardware architecture satisfying all functional, performance, and compliance requirements for the Djezzy National SOC Platform. The "
        "recommended configuration delivers enterprise-grade security operations capabilities including real-time event processing at fifty "
        "thousand events per second, line-rate packet capture at 100Gbps, multi-billion-event searchable repositories, integrated threat "
        "intelligence, automated incident response playbooks, and comprehensive vulnerability management. All infrastructure operates within "
        "Djezzy-owned facilities under complete organizational control, with air-gap capability ensuring continued operation without any external "
        "network connectivity once initial deployment completes.",
        styles['CustomBody']
    ))
    
    elements.append(Paragraph("8.2 Immediate Action Items (Next 30 Days)", styles['Heading2Custom']))
    
    actions = [
        ("<b>Week 1: Facility Assessment</b>", 
         "Conduct detailed assessment of primary data center site(s) evaluating available power capacity (kVA), cooling capacity (kW), "
         "rack floor space (square meters and RU count), network uplink availability (fiber providers, bandwidth options), and physical "
         "security posture (access control, CCTV, fire suppression). Document gaps requiring remediation before equipment installation."),
        
        ("<b>Week 2: Vendor Engagement</b>", 
         "Issue requests for quotation (RFQ) to preferred hardware vendors for server, storage, and networking equipment specified in this "
         "guide. Engage with at least three vendors to ensure competitive pricing. Request proof-of-concept evaluation units for critical "
         "components (particularly 100GbE capture NICs and NVMe storage arrays) to validate performance claims."),
        
        ("<b>Week 3: Team Formation</b>", 
         "Identify personnel who will form the core platform engineering team (target: 3-4 FTE for platform, 2 FTE for security operations). "
         "Assess skill gaps against required competencies (Linux administration, Docker/Kubernetes, Elasticsearch, networking, security tools). "
         "Initiate training plans for technologies new to the organization. Establish development/staging environment for practice deployments."),
        
        ("<b>Week 4: Project Planning Finalization</b>", 
         "Finalize detailed project schedule with resource loading, milestone dates, and risk register. Establish governance structure including "
         "steering committee, change control board, and escalation procedures. Secure executive sponsorship and budget authorization. Prepare "
         "procurement documentation for hardware purchase orders targeting Week 5-6 submission."),
    ]
    
    for title, desc in actions:
        elements.append(Paragraph(title, styles['Heading3Custom']))
        elements.append(Paragraph(desc, styles['CustomBody']))
    
    elements.append(Paragraph("8.3 Success Metrics", styles['Heading2Custom']))
    
    # KPI table
    kpi_data = [
        ['Metric Category', 'Key Performance Indicator', 'Target', 'Measurement Method'],
        ['Availability', 'Platform uptime (primary site)', '> 99.99%', 'Prometheus/Grafana monitoring'],
        ['Availability', 'DR failover time (RTO)', '< 30 minutes', 'Quarterly DR drill timing'],
        ['Performance', 'Events per second (sustained)', '> 50,000 EPS', 'Kafka consumer metrics'],
        ['Performance', 'Search query response (p95)', '< 3 seconds', 'Kibana/Elasticsearch logging'],
        ['Integrity', 'Data loss incidents', 'Zero', 'Replication lag monitoring'],
        ['Security', 'Vulnerabilities (critical/high)', '< 30 days remediation', 'OpenVAS/DefectDojo tracking'],
        ['Operations', 'Runbook procedure coverage', '> 90% documented', 'Documentation audit'],
        ['Personnel', 'Team certification rate', '> 80% certified', 'Training records review'],
    ]
    
    kpi_table = Table(kpi_data, colWidths=[80, 145, 90, 140])
    kpi_table.setStyle(create_table_style())
    elements.append(kpi_table)
    elements.append(Paragraph("Table 8.1: Post-Deployment Success Metrics Framework", styles['Caption']))
    
    elements.append(Spacer(1, 15))
    
    # Closing statement
    elements.append(Paragraph(
        "This 100% On-Premises Hardware Architecture Guide provides a complete blueprint for deploying the Djezzy National SOC Platform entirely "
        "within Djezzy-owned infrastructure. The design satisfies the most stringent data sovereignty requirements while delivering capabilities "
        "comparable to or exceeding those of peer telecommunications operators globally. Successful execution of this plan will establish Djezzy "
        "as a regional leader in telecommunications security operations, with a platform capable of evolving alongside emerging threats and "
        "expanding operational scope as business requirements dictate. The air-gappable architecture ensures operational resilience regardless "
        "of external connectivity status, a critical capability for national infrastructure protection.",
        styles['CustomBody']
    ))
    
    return elements


def build_document():
    """Main function to build the complete PDF document"""
    doc = SimpleDocTemplate(
        OUTPUT_PATH,
        pagesize=A4,
        rightMargin=18*mm,
        leftMargin=18*mm,
        topMargin=22*mm,
        bottomMargin=22*mm,
        title="Djezzy SOC Platform - 100% On-Premises Hardware Architecture Guide",
        author="Djezzy Security Operations Center",
        subject="On-Premises Deployment Architecture - No Cloud Dependencies"
    )
    
    styles = create_styles()
    story = []
    
    # Build all sections
    story.extend(build_cover_page(styles))
    story.extend(build_executive_summary(styles))
    story.append(PageBreak())
    story.extend(build_primary_site_architecture(styles))
    story.append(PageBreak())
    story.extend(build_disaster_recovery_site(styles))
    story.append(PageBreak())
    story.extend(build_network_infrastructure(styles))
    story.append(PageBreak())
    story.extend(build_physical_facilities(styles))
    story.append(PageBreak())
    story.extend(build_implementation_phases(styles))
    story.append(PageBreak())
    story.extend(build_cost_estimation(styles))
    story.append(PageBreak())
    story.extend(build_recommendations(styles))
    
    # Build PDF
    doc.build(story)
    print(f"PDF generated successfully: {OUTPUT_PATH}")
    return OUTPUT_PATH


if __name__ == "__main__":
    output_file = build_document()
    print(f"\nDocument saved to: {output_file}")
