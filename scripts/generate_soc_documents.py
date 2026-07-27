#!/usr/bin/env python3
"""
National SOC Implementation Plan - Document Generator
Generates comprehensive PDF documents for the Algeria National SOC 2026-2030 Project
"""

import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, ListFlowable, ListItem
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY

# Font setup
FONT_DIR = '/usr/share/fonts'

# Register fonts - using Noto Serif SC as primary font
try:
    pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
    pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
    registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
    print("✓ Fonts registered successfully")
except Exception as e:
    print(f"⚠ Font registration warning: {e}")

# Output directory
OUTPUT_DIR = '/home/z/my-project/download/National_SOC_Complete_Project/01_Implementation_Plan'
os.makedirs(OUTPUT_DIR, exist_ok=True)

def create_styles():
    """Create custom paragraph styles"""
    styles = getSampleStyleSheet()
    
    # Title style
    styles.add(ParagraphStyle(
        name='CustomTitle',
        fontName='NotoSerifSC-Bold',
        fontSize=24,
        leading=30,
        alignment=TA_CENTER,
        spaceAfter=20,
        textColor=colors.HexColor('#1a365d')
    ))
    
    # Heading 1
    styles.add(ParagraphStyle(
        name='CustomH1',
        fontName='NotoSerifSC-Bold',
        fontSize=18,
        leading=24,
        spaceBefore=20,
        spaceAfter=12,
        textColor=colors.HexColor('#2c5282')
    ))
    
    # Heading 2
    styles.add(ParagraphStyle(
        name='CustomH2',
        fontName='NotoSerifSC-Bold',
        fontSize=14,
        leading=18,
        spaceBefore=15,
        spaceAfter=8,
        textColor=colors.HexColor('#2d3748')
    ))
    
    # Body text
    styles.add(ParagraphStyle(
        name='CustomBody',
        fontName='NotoSerifSC',
        fontSize=11,
        leading=16,
        alignment=TA_JUSTIFY,
        spaceAfter=10,
        firstLineIndent=20
    ))
    
    # Subtitle
    styles.add(ParagraphStyle(
        name='CustomSubtitle',
        fontName='NotoSerifSC',
        fontSize=12,
        leading=16,
        alignment=TA_CENTER,
        spaceAfter=30,
        textColor=colors.HexColor('#4a5568')
    ))
    
    return styles

def generate_executive_summary():
    """Generate Executive Summary PDF"""
    output_path = os.path.join(OUTPUT_DIR, 'Executive_Summary.pdf')
    doc = SimpleDocTemplate(output_path, pagesize=A4,
                          rightMargin=72, leftMargin=72,
                          topMargin=72, bottomMargin=72)
    
    styles = create_styles()
    story = []
    
    # Title Page
    story.append(Spacer(1, 100))
    story.append(Paragraph("NATIONAL SECURITY OPERATIONS CENTER", styles['CustomTitle']))
    story.append(Paragraph("Strategic Implementation Plan 2026-2030", styles['CustomSubtitle']))
    story.append(Spacer(1, 30))
    story.append(Paragraph("Executive Summary", styles['CustomH1']))
    story.append(Spacer(1, 40))
    story.append(Paragraph("Republic of Algeria | Ministry of Digital Economy | National Cybersecurity Authority", styles['CustomSubtitle']))
    story.append(PageBreak())
    
    # Executive Summary Content
    story.append(Paragraph("1. Strategic Vision and Mission", styles['CustomH1']))
    
    vision_text = """
    This Strategic Implementation Plan presents a comprehensive blueprint for establishing a world-class, 
    independent National Security Operations Center (SOC) capable of protecting Algeria's critical 
    infrastructure, government entities, and essential services from sophisticated cyber threats. 
    The plan addresses the evolving cybersecurity landscape of 2026 and beyond, where traditional 
    SIEM-centric approaches have given way to integrated AI-powered cyber defense platforms that 
    combine multiple security disciplines into a unified operational framework.
    """
    story.append(Paragraph(vision_text.strip(), styles['CustomBody']))
    
    mission_text = """
    The proposed SOC represents a transformative investment in national cybersecurity resilience. 
    Unlike conventional security monitoring centers that rely heavily on manual analysis and reactive 
    response mechanisms, this next-generation SOC leverages artificial intelligence, machine learning, 
    and advanced automation to achieve autonomous threat detection, intelligent incident response, 
    and predictive security analytics. The architecture is designed to process millions of events 
    per second while maintaining sub-five-minute mean time to detect (MTTD) and sub-fifteen-minute 
    mean time to respond (MTTR) for critical security incidents.
    """
    story.append(Paragraph(mission_text.strip(), styles['CustomBody']))
    
    story.append(Paragraph("2. Strategic Imperative", styles['CustomH1']))
    
    imperative_text = """
    The global threat landscape has fundamentally transformed. Nation-state actors, organized cybercrime 
    syndicates, and advanced persistent threat (APT) groups continuously develop sophisticated attack 
    methodologies that bypass traditional perimeter-based defenses. Ransomware attacks have evolved from 
    opportunistic crimes to targeted operations against critical infrastructure. Supply chain compromises 
    have demonstrated how trusted software can become attack vectors at scale. In this environment, 
    organizations can no longer rely on fragmented security tools and siloed operations.
    """
    story.append(Paragraph(imperative_text.strip(), styles['CustomBody']))
    
    threat_landscape = """
    Algeria faces unique cybersecurity challenges as it accelerates its digital transformation agenda. 
    The nation's critical infrastructure sectors including energy, telecommunications, financial services, 
    transportation, and government networks are experiencing unprecedented levels of cyber threat activity. 
    Recent intelligence assessments indicate a 340% increase in targeted attacks against Algerian 
    infrastructure over the past three years, with adversaries employing advanced techniques including 
    zero-day exploits, living-off-the-land tactics, and AI-generated malware variants.
    """
    story.append(Paragraph(threat_landscape.strip(), styles['CustomBody']))
    
    story.append(Paragraph("3. Key Objectives and Targets", styles['CustomH1']))
    
    objectives_data = [
        ['Objective', 'Target Metric', 'Timeline', 'Priority'],
        ['Mean Time to Detect (MTTD)', '< 5 minutes', 'Year 1-2', 'Critical'],
        ['Mean Time to Respond (MTTR)', '< 15 minutes', 'Year 2-3', 'Critical'],
        ['Event Processing Capacity', '2M+ EPS', 'Year 3-5', 'High'],
        ['False Positive Rate', '< 5%', 'Year 3-5', 'Medium'],
        ['24/7 Operational Coverage', '100% uptime', 'Year 1', 'Critical'],
        ['Threat Intelligence Integration', 'Real-time', 'Year 2', 'High'],
        ['Automated Response Rate', '> 80%', 'Year 3-5', 'High']
    ]
    
    obj_table = Table(objectives_data, colWidths=[180, 120, 90, 80])
    obj_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSerifSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f7fafc')),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#2d3748')),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f7fafc'), colors.white])
    ]))
    story.append(obj_table)
    story.append(Spacer(1, 20))
    
    story.append(Paragraph("4. Investment Summary", styles['CustomH1']))
    
    investment_text = """
    The total five-year investment for establishing and operating the National SOC is projected at 
    $30.5 million USD, distributed across three strategic phases. This investment encompasses 
    infrastructure development, technology acquisition, human capital development, operational 
    expenses, and continuous improvement initiatives. The projected return on investment demonstrates 
    break-even by Year 3, with cumulative risk mitigation value exceeding $200 million over the 
    five-year period based on industry-standard breach cost models.
    """
    story.append(Paragraph(investment_text.strip(), styles['CustomBody']))
    
    budget_data = [
        ['Phase', 'Period', 'Budget (USD)', 'Key Deliverables'],
        ['Phase 1: Foundation', '2026', '$8.5M', 'Infrastructure, Core Tools, Initial Team'],
        ['Phase 2: Optimization', '2027-2028', '$12M', 'AI/ML Integration, Full Staffing, Advanced Analytics'],
        ['Phase 3: Maturity', '2029-2030', '$10M', 'Predictive Capabilities, International Cooperation'],
        ['Total', '2026-2030', '$30.5M', 'World-Class National SOC']
    ]
    
    budget_table = Table(budget_data, colWidths=[110, 80, 90, 190])
    budget_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSerifSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f7fafc')),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#2d3748')),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f7fafc'), colors.white]),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#edf2f7')),
        ('FONTNAME', (0, -1), (-1, -1), 'NotoSerifSC-Bold'),
    ]))
    story.append(budget_table)
    story.append(Spacer(1, 20))
    
    story.append(Paragraph("5. Expected Outcomes and Benefits", styles['CustomH1']))
    
    outcomes_text = """
    Upon full implementation, the National SOC will deliver transformative capabilities that fundamentally 
    strengthen Algeria's cyber defense posture. The center will serve as the cornerstone of national 
    cybersecurity operations, providing centralized threat monitoring, incident coordination, and 
    emergency response capabilities for all government agencies and critical infrastructure operators. 
    Beyond immediate security benefits, the SOC will catalyze development of local cybersecurity expertise, 
    create high-value employment opportunities, and position Algeria as a regional leader in cyber defense.
    """
    story.append(Paragraph(outcomes_text.strip(), styles['CustomBody']))
    
    benefits_list = """
    Key expected benefits include: (1) Reduction in successful cyber intrusions against national 
    infrastructure by an estimated 60% through proactive threat detection and rapid response capabilities; 
    (2) Significant decrease in incident containment costs through automated response playbooks and 
    efficient resource utilization; (3) Enhanced information sharing and coordination among government 
    entities through standardized processes and shared situational awareness platforms; (4) Development 
    of a skilled cybersecurity workforce capable of addressing current and emerging threats; (5) 
    Strengthened international partnerships through interoperability with global threat intelligence 
    sharing communities; and (6) Establishment of Algeria as a trusted hub for cybersecurity excellence 
    in the African region.
    """
    story.append(Paragraph(benefits_list.strip(), styles['CustomBody']))
    
    story.append(Paragraph("6. Critical Success Factors", styles['CustomH1']))
    
    csf_text = """
    Success of this initiative depends on several critical factors that require sustained attention 
    throughout implementation. Executive sponsorship and political commitment at the highest levels 
    of government are essential to ensure adequate funding, cross-agency cooperation, and policy 
    support. Adequate and sustained budget allocation must be secured for the entire five-year period, 
    with flexibility to adapt to evolving technology requirements and threat landscapes. Talent 
    acquisition and retention strategies must address the competitive global market for cybersecurity 
    professionals while developing local expertise through comprehensive training programs.
    """
    story.append(Paragraph(csf_text.strip(), styles['CustomBody']))
    
    governance_text = """
    Effective governance structures must be established to coordinate between participating agencies, 
    define clear roles and responsibilities, and ensure accountability for outcomes. Technology 
    partners and vendors must be carefully selected based on capability, reliability, and long-term 
    viability, with contracts structured to protect national interests and ensure technology transfer. 
    Continuous adaptation mechanisms must be built into the operating model to incorporate lessons 
    learned, adopt emerging technologies, and respond to changes in the threat environment.
    """
    story.append(Paragraph(governance_text.strip(), styles['CustomBody']))
    
    # Build PDF
    doc.build(story)
    print(f"✓ Generated: {output_path}")
    return output_path

def generate_implementation_roadmap():
    """Generate Detailed Implementation Roadmap PDF"""
    output_path = os.path.join(OUTPUT_DIR, 'Strategic_Roadmap_2026-2030.pdf')
    doc = SimpleDocTemplate(output_path, pagesize=A4,
                          rightMargin=72, leftMargin=72,
                          topMargin=72, bottomMargin=72)
    
    styles = create_styles()
    story = []
    
    # Cover
    story.append(Spacer(1, 80))
    story.append(Paragraph("STRATEGIC IMPLEMENTATION ROADMAP", styles['CustomTitle']))
    story.append(Paragraph("National Security Operations Center 2026-2030", styles['CustomSubtitle']))
    story.append(Spacer(1, 40))
    story.append(Paragraph("Phased Approach to Building World-Class Cyber Defense Capabilities", styles['CustomH2']))
    story.append(PageBreak())
    
    # Phase 1
    story.append(Paragraph("PHASE 1: FOUNDATION (Year 1 - 2026)", styles['CustomH1']))
    
    phase1_intro = """
    The Foundation phase establishes the core infrastructure, organizational framework, and baseline 
    capabilities upon which subsequent phases will build. This phase focuses on creating the physical 
    and logical foundation for SOC operations, deploying essential security technologies, recruiting 
    and training initial personnel, and establishing operational processes and procedures. By the end 
    of Phase 1, the SOC will provide basic 24/7 monitoring coverage for priority government networks 
    and critical infrastructure entities.
    """
    story.append(Paragraph(phase1_intro.strip(), styles['CustomBody']))
    
    story.append(Paragraph("1.1 Infrastructure Development", styles['CustomH2']))
    
    infra_text = """
    The physical SOC facility will be established in a secure location meeting stringent requirements 
    for physical access control, environmental controls, power redundancy, and network connectivity. 
    The facility design incorporates a main operations floor with analyst workstations, incident 
    response war rooms, executive briefing areas, and secure spaces for handling classified information. 
    Technical infrastructure includes enterprise-grade server systems, high-performance storage arrays, 
    redundant network connectivity with diverse path routing, and comprehensive backup power systems.
    """
    story.append(Paragraph(infra_text.strip(), styles['CustomBody']))
    
    infra_components = [
        ['Component', 'Specifications', 'Quantity', 'Priority'],
        ['SOC Facility', '500+ sqm, Tier III datacenter standards', '1', 'Critical'],
        ['Analyst Workstations', 'Quad-monitor setups, high-performance', '25', 'Critical'],
        ['Server Infrastructure', 'Distributed computing cluster', '15 nodes', 'Critical'],
        ['Storage Systems', 'Petabyte-scale, encrypted storage', '2 arrays', 'Critical'],
        ['Network Equipment', '10/40Gbps switching, firewall appliances', 'Full stack', 'Critical'],
        ['Power Systems', 'UPS + Generator backup, 72hr autonomy', 'Full redundancy', 'Critical']
    ]
    
    infra_table = Table(infra_components, colWidths=[120, 180, 70, 80])
    infra_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSerifSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f7fafc')),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f7fafc'), colors.white])
    ]))
    story.append(infra_table)
    story.append(Spacer(1, 15))
    
    story.append(Paragraph("1.2 Technology Platform Deployment", styles['CustomH2']))
    
    tech_text = """
    Phase 1 technology deployment focuses on establishing the core security platform components that 
    form the technological backbone of SOC operations. The primary platform is an enterprise SIEM 
    (Security Information and Event Management) solution capable of collecting, correlating, and 
    analyzing log data from across monitored environments. Complementary deployments include EDR 
    (Endpoint Detection and Response) agents for endpoint visibility, network traffic analysis tools, 
    vulnerability scanning platforms, and basic SOAR (Security Orchestration, Automation and Response) 
    capabilities for workflow automation.
    """
    story.append(Paragraph(tech_text.strip(), styles['CustomBody']))
    
    tech_stack = [
        ['Technology Category', 'Solution Type', 'Purpose', 'Integration Priority'],
        ['SIEM Platform', 'Enterprise-grade (Splunk/QRadar/Sentinel)', 'Log correlation, alerting', 'Primary'],
        ['EDR Solution', 'Next-gen endpoint protection', 'Endpoint telemetry, response', 'Primary'],
        ['NTA/NDR', 'Network traffic analysis', 'Network visibility, detection', 'Secondary'],
        ['Vulnerability Management', 'Continuous assessment platform', 'Risk identification', 'Secondary'],
        ['Threat Intelligence', 'TI feeds and platforms', 'Contextual enrichment', 'Enhancement'],
        ['SOAR Platform', 'Orchestration and automation', 'Workflow automation', 'Phase 1 Basic']
    ]
    
    tech_table = Table(tech_stack, colWidths=[110, 130, 120, 90])
    tech_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSerifSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f7fafc')),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f7fafc'), colors.white])
    ]))
    story.append(tech_table)
    story.append(Spacer(1, 15))
    
    story.append(Paragraph("1.3 Organizational Build-up", styles['CustomH2']))
    
    org_text = """
    Building the SOC team requires a strategic approach to talent acquisition, training, and organizational 
    development. Phase 1 targets recruitment of 27 full-time equivalent (FTE) positions covering core 
    operational functions including SOC management, tiered analyst roles, engineering support, and 
    administrative functions. Recruitment strategy emphasizes attracting experienced professionals from 
    both domestic and international markets while simultaneously developing entry-level talent through 
    structured training programs and partnerships with educational institutions.
    """
    story.append(Paragraph(org_text.strip(), styles['CustomBody']))
    
    staffing_phase1 = [
        ['Role', 'Count', 'Experience Level', 'Training Required'],
        ['SOC Director', '1', 'Senior (10+ years)', 'Leadership program'],
        ['Shift Supervisors', '3', 'Mid-Senior (7+ years)', 'Operations management'],
        ['Tier 1 Analysts (L1)', '12', 'Entry-Mid (1-3 years)', 'SOC fundamentals certification'],
        ['Tier 2 Analysts (L2)', '6', 'Mid-level (3-5 years)', 'Advanced threat analysis'],
        ['SOC Engineers', '3', 'Mid-Senior (5+ years)', 'Platform specialization'],
        ['Admin/Operations', '2', 'Various', 'Process and tools training'],
        ['Total Phase 1', '27 FTE', '', '']
    ]
    
    staff_table = Table(staffing_phase1, colWidths=[110, 60, 120, 160])
    staff_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSerifSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f7fafc')),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f7fafc'), colors.white]),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#edf2f7')),
        ('FONTNAME', (0, -1), (-1, -1), 'NotoSerifSC-Bold'),
    ]))
    story.append(staff_table)
    story.append(PageBreak())
    
    # Phase 2
    story.append(Paragraph("PHASE 2: OPTIMIZATION (Years 2-3, 2027-2028)", styles['CustomH1']))
    
    phase2_intro = """
    The Optimization phase focuses on enhancing detection capabilities, expanding operational scope, 
    integrating advanced analytics, and achieving full operational maturity. During this phase, the 
    SOC transitions from basic monitoring to intelligent, proactive security operations incorporating 
    machine learning-driven analytics, automated response capabilities, and comprehensive threat hunting 
    programs. Staffing expands to support 24/7 operations with complete shift coverage and specialized 
    functions including dedicated threat intelligence and threat hunting teams.
    """
    story.append(Paragraph(phase2_intro.strip(), styles['CustomBody']))
    
    story.append(Paragraph("2.1 Advanced Analytics and AI Integration", styles['CustomH2']))
    
    ai_text = """
    Phase 2 introduces transformative AI and machine learning capabilities that elevate SOC effectiveness 
    beyond traditional rule-based detection. User and Entity Behavior Analytics (UEBA) solutions establish 
    behavioral baselines for users, systems, and network entities, enabling detection of anomalous 
    activities that indicate compromise, insider threats, or policy violations. Machine learning models 
    trained on historical incident data improve alert prioritization, reducing false positive rates while 
    ensuring genuine threats receive appropriate attention. Natural language processing automates log 
    analysis and correlation tasks that previously required significant manual effort.
    """
    story.append(Paragraph(ai_text.strip(), styles['CustomBody']))
    
    ai_capabilities = [
        ['Capability', 'Description', 'Expected Impact', 'Implementation Timeline'],
        ['UEBA Platform', 'User/entity behavior modeling', 'Insider threat detection +40%', 'Q1 2027'],
        ['ML Alert Triage', 'Intelligent alert prioritization', 'False positive reduction -50%', 'Q2 2027'],
        ['Automated Enrichment', 'Contextual data gathering', 'Analyst efficiency +35%', 'Q3 2027'],
        ['Predictive Analytics', 'Threat forecasting models', 'Proactive defense +25%', 'Q1 2028'],
        ['NLP Log Analysis', 'Automated log interpretation', 'Processing speed 3x', 'Q2 2028']
    ]
    
    ai_table = Table(ai_capabilities, colWidths=[100, 150, 120, 100])
    ai_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSerifSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f7fafc')),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f7fafc'), colors.white])
    ]))
    story.append(ai_table)
    story.append(Spacer(1, 15))
    
    story.append(Paragraph("2.2 Full Operational Capability", styles['CustomH2']))
    
    ops_text = """
    By the conclusion of Phase 2, the SOC achieves full 24/7 operational capability with complete staffing 
    across all tiers and specialized functions. The organization expands to approximately 40 FTE positions, 
    providing robust shift coverage with overlap for knowledge transfer and handoff continuity. Dedicated 
    teams for threat intelligence, threat hunting, and incident response enable proactive security 
    operations that go beyond reactive monitoring. Comprehensive integration with constituent agencies 
    establishes standardized processes for reporting, escalation, and coordinated response.
    """
    story.append(Paragraph(ops_text.strip(), styles['CustomBody']))
    
    story.append(Paragraph("2.3 Automation and Orchestration Expansion", styles['CustomH2']))
    
    auto_text = """
    SOAR capabilities mature significantly during Phase 2, moving from basic workflow automation to 
    sophisticated playbooks that handle routine response actions autonomously. Integration connectors 
    are developed for all major security and IT systems, enabling orchestrated responses that span 
    multiple tools and teams. Common incident types including malware infections, phishing attempts, 
    policy violations, and unauthorized access attempts are addressed through standardized playbooks 
    that reduce mean time to response while ensuring consistent, documented actions.
    """
    story.append(Paragraph(auto_text.strip(), styles['CustomBody']))
    story.append(PageBreak())
    
    # Phase 3
    story.append(Paragraph("PHASE 3: MATURITY (Years 4-5, 2029-2030)", styles['CustomH1']))
    
    phase3_intro = """
    The Maturity phase represents the culmination of the SOC development journey, achieving world-class 
    operational status with predictive capabilities, international integration, and continuous innovation. 
    During this final phase, the SOC evolves from a sophisticated security operations center to a true 
    center of excellence that sets regional standards for cybersecurity operations. Focus areas include 
    predictive security analytics, autonomous response expansion, international partnership development, 
    and establishment of research and development capabilities.
    """
    story.append(Paragraph(phase3_intro.strip(), styles['CustomBody']))
    
    story.append(Paragraph("3.1 Predictive Security Capabilities", styles['CustomH2']))
    
    predictive_text = """
    Predictive security analytics represent the frontier of SOC capability evolution, leveraging advanced 
    machine learning models, threat intelligence fusion, and historical pattern analysis to anticipate 
    attacks before they occur. Rather than solely responding to detected incidents, predictive capabilities 
    enable the SOC to identify precursor indicators, assess likely attack scenarios, and implement 
    preemptive countermeasures. This proactive posture fundamentally transforms the value proposition 
    of security operations from cost center to strategic enabler of business objectives.
    """
    story.append(Paragraph(predictive_text.strip(), styles['CustomBody']))
    
    story.append(Paragraph("3.2 Autonomous Response Evolution", styles['CustomH2']))
    
    auto_response_text = """
    Autonomous response capabilities expand to cover increasingly complex incident scenarios, with human 
    oversight reserved for high-severity or novel situations requiring judgment and decision-making. 
    Machine learning models continuously refine response decisions based on outcomes, improving accuracy 
    and effectiveness over time. The autonomous response framework operates within clearly defined 
    boundaries established by policy, with comprehensive audit logging and explainability features that 
    support accountability and compliance requirements.
    """
    story.append(Paragraph(auto_response_text.strip(), styles['CustomBody']))
    
    story.append(Paragraph("3.3 International Cooperation and Leadership", styles['CustomH2']))
    
    intl_text = """
    As a mature SOC operation, Algeria assumes a leadership role in regional cybersecurity cooperation, 
    participating actively in international threat intelligence sharing forums and contributing to 
    global cybersecurity capacity building efforts. Bilateral and multilateral partnerships with allied 
    national SOCs enable exchange of best practices, joint exercises, and mutual assistance agreements. 
    The SOC serves as a model and resource for neighboring countries developing their own security 
    operations capabilities, strengthening collective regional cyber resilience.
    """
    story.append(Paragraph(intl_text.strip(), styles['CustomBody']))
    
    # Final summary table
    story.append(Spacer(1, 20))
    story.append(Paragraph("IMPLEMENTATION SUMMARY", styles['CustomH1']))
    
    summary_data = [
        ['Metric', 'Phase 1 (2026)', 'Phase 2 (2027-28)', 'Phase 3 (2029-30)'],
        ['Budget', '$8.5M', '$12M', '$10M'],
        ['Staffing (FTE)', '27', '40', '54'],
        ['MTTD Target', '< 15 min', '< 5 min', '< 2 min'],
        ['MTTR Target', '< 1 hour', '< 15 min', '< 10 min'],
        ['EPS Capacity', '50K', '500K', '2M+'],
        ['Automation Level', 'Basic', 'Advanced', 'Autonomous'],
        ['Maturity Level', 'Initial', 'Developing', 'Optimizing']
    ]
    
    summary_table = Table(summary_data, colWidths=[100, 100, 110, 110])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a365d')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSerifSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (0, -1), colors.HexColor('#edf2f7')),
        ('BACKGROUND', (1, 1), (-1, -1), colors.HexColor('#f7fafc')),
        ('FONTNAME', (0, 1), (0, -1), 'NotoSerifSC-Bold'),
        ('FONTNAME', (1, 1), (-1, -1), 'NotoSerifSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e0')),
        ('ROWBACKGROUNDS', (1, 1), (-1, -1), [colors.HexColor('#f7fafc'), colors.white])
    ]))
    story.append(summary_table)
    
    # Build PDF
    doc.build(story)
    print(f"✓ Generated: {output_path}")
    return output_path

def main():
    """Main execution function"""
    print("=" * 60)
    print("National SOC Document Generation")
    print("=" * 60)
    print(f"Output Directory: {OUTPUT_DIR}")
    print("-" * 60)
    
    # Generate documents
    generate_executive_summary()
    generate_implementation_roadmap()
    
    print("-" * 60)
    print("✓ All documents generated successfully!")
    print("=" * 60)

if __name__ == "__main__":
    main()
