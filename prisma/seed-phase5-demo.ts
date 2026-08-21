import { db } from '../src/lib/db';

// User IDs from existing RBAC seed
const USERS = {
  admin: 'cms3i887l038pstp00tpwexmi',
  noc: 'cms3i889l038sstp09h6vfycr',
  rf: 'cms3i88bk038vstp0ffpmfiac',
  nop: 'cms3i88dk038ystp0o04dmbq3',
  field: 'cms3i88fk0391stp0av2ga4bg',
  viewer: 'cms3i88hk0394stp0w711pp17',
};

const ALERT_IDS = [
  'cmsrqg10701htrprtox3l613b',
  'cmsrqg10701hurprt3j4cs1b4',
  'cmsrqg10701hvrprta6836uwd',
];

const INCIDENT_IDS = [
  'cmsrqg15a025lrprtliybn3uv',
  'cmsrqg15a025mrprtdm43g5hd',
  'cmsrqg15a025nrprtkiqyf05d',
];

const CHANGE_IDS = [
  'cmsrqg16a02hkrprt6cou7cqc',
  'cmsrqg16a02hlrprtvjxed0dk',
  'cmsrqg16a02hmrprtq6sgk4eg',
];

const SITE_IDS = [
  'cmsrqg0t40000rprt9bgmzre6',
  'cmsrqg0t50001rprt5va8qi6g',
  'cmsrqg0t50002rprtjgd0krwm',
  'cmsrqg0t70004rprtnzxdtbui',
];

async function main() {
  console.log('🌱 Seeding Phase 5 demo data (Notifications, UserPreferences, Comments, Annotations)...\n');

  // ──────────────────────────────────────────────
  // 1. UserPreferences (one per user)
  // ──────────────────────────────────────────────
  console.log('  Seeding UserPreferences...');
  const prefsData = [
    { userId: USERS.admin, locale: 'fr', theme: 'dark', notificationEmail: true, notificationPush: true, notificationSound: false, alertSeverities: '["critical","high","medium"]', alertCategories: '["alert","incident","change","ai"]', digestFrequency: 'realtime', sidebarCollapsed: false, dashboardLayout: 'expanded', kpiDefaults: '{"primary":"rsrp","secondary":"throughputDl"}' },
    { userId: USERS.noc, locale: 'fr', theme: 'system', notificationEmail: true, notificationPush: true, notificationSound: true, alertSeverities: '["critical","high"]', alertCategories: '["alert","incident"]', digestFrequency: 'realtime', sidebarCollapsed: true, dashboardLayout: 'default', kpiDefaults: '{}' },
    { userId: USERS.rf, locale: 'fr', theme: 'light', notificationEmail: true, notificationPush: false, notificationSound: true, alertSeverities: '["high","medium"]', alertCategories: '["alert","change"]', digestFrequency: 'hourly', sidebarCollapsed: false, dashboardLayout: 'default', kpiDefaults: '{"primary":"rsrq"}' },
    { userId: USERS.nop, locale: 'en', theme: 'dark', notificationEmail: false, notificationPush: true, notificationSound: false, alertSeverities: '["critical"]', alertCategories: '["alert","incident","change"]', digestFrequency: 'realtime', sidebarCollapsed: false, dashboardLayout: 'default', kpiDefaults: '{}' },
    { userId: USERS.field, locale: 'ar', theme: 'system', notificationEmail: true, notificationPush: true, notificationSound: true, alertSeverities: '["critical","high","medium","low"]', alertCategories: '["alert","incident","change","collaboration"]', digestFrequency: 'daily', sidebarCollapsed: true, dashboardLayout: 'compact', kpiDefaults: '{}' },
    { userId: USERS.viewer, locale: 'fr', theme: 'light', notificationEmail: false, notificationPush: false, notificationSound: false, alertSeverities: '["critical"]', alertCategories: '["alert"]', digestFrequency: 'daily', sidebarCollapsed: false, dashboardLayout: 'default', kpiDefaults: '{}' },
  ];
  const prefs = [];
  for (const p of prefsData) {
    prefs.push(await db.userPreferences.upsert({
      where: { userId: p.userId },
      update: p,
      create: p,
    }));
  }
  console.log(`    UserPreferences: ${prefs.length}`);

  // ──────────────────────────────────────────────
  // 2. Notifications (diverse: broadcast + user-specific)
  // ──────────────────────────────────────────────
  console.log('  Seeding Notifications...');
  const now = new Date();
  const notifications = [
    // Broadcast notifications (userId = null)
    { userId: null, title: 'Système en ligne', message: 'NetOptima DZ a été mis à jour avec succès. Nouvelles fonctionnalités AI disponibles.', type: 'success', category: 'system', severity: 'info', source: 'system', link: null, linkLabel: null, isRead: true, readAt: new Date(now.getTime() - 6 * 3600000), createdAt: new Date(now.getTime() - 24 * 3600000) },
    { userId: null, title: 'Maintenance planifiée', message: 'Maintenance du serveur OSS prévue ce soir de 02h00 à 04h00 (heure Alger). Impact mineur sur les rapports.', type: 'warning', category: 'system', severity: 'medium', source: 'system', link: null, linkLabel: null, isRead: false, createdAt: new Date(now.getTime() - 2 * 3600000) },
    { userId: null, title: 'Rapport hebdomadaire disponible', message: 'Le rapport KPI hebdomadaire S29 est prêt au téléchargement.', type: 'info', category: 'report', severity: 'info', source: 'system', link: 'reports', linkLabel: 'Voir les rapports', isRead: false, createdAt: new Date(now.getTime() - 8 * 3600000) },

    // Alert-related notifications
    { userId: USERS.noc, title: 'Alerte critique: RSRP dégradé', message: 'Le site LTE-AL-001 présente un RSRP moyen de -108 dBm, en dessous du seuil critique de -105 dBm.', type: 'alert', category: 'alert', severity: 'critical', source: 'trigger', link: 'alerts', linkLabel: 'Voir les alertes', metadata: '{"alertId":"' + ALERT_IDS[0] + '","siteCode":"AL001L","metric":"rsrp"}', isRead: false, createdAt: new Date(now.getTime() - 30 * 60000) },
    { userId: USERS.noc, title: 'Alerte haute: Taux de coupure 4G', message: 'Le taux de coupure sur LTE-OR-001 a atteint 2.8%, dépassant le seuil SLA de 1.5%.', type: 'alert', category: 'alert', severity: 'high', source: 'trigger', link: 'alerts', linkLabel: 'Voir les alertes', metadata: '{"alertId":"' + ALERT_IDS[1] + '","siteCode":"OR001L","metric":"dropRate"}', isRead: true, readAt: new Date(now.getTime() - 45 * 60000), createdAt: new Date(now.getTime() - 3 * 3600000) },
    { userId: USERS.rf, title: 'Nouvelle anomalie détectée', message: 'Anomalie PRB utilization > 95% détectée sur NR-AL-002 pendant 3 heures consécutives.', type: 'warning', category: 'alert', severity: 'high', source: 'trigger', link: 'anomalies', linkLabel: 'Voir les anomalies', isRead: false, createdAt: new Date(now.getTime() - 90 * 60000) },

    // Incident-related notifications
    { userId: USERS.admin, title: 'Incident majeur déclaré', message: 'Major Outage - LTE-AL-001: Perte totale de service. Impact estimé: 2500 abonnés.', type: 'error', category: 'incident', severity: 'critical', source: 'trigger', link: 'incidents', linkLabel: 'Voir l\'incident', metadata: '{"incidentId":"' + INCIDENT_IDS[0] + '"}', isRead: false, createdAt: new Date(now.getTime() - 15 * 60000) },
    { userId: USERS.noc, title: 'Incident: Panne BBU NR-AL-001', message: 'Le BBU du site 5G NR-AL-001 a subi un crash. Redémarrage en cours.', type: 'error', category: 'incident', severity: 'critical', source: 'trigger', link: 'incidents', linkLabel: 'Voir l\'incident', metadata: '{"incidentId":"' + INCIDENT_IDS[1] + '"}', isRead: true, readAt: new Date(now.getTime() - 60 * 60000), createdAt: new Date(now.getTime() - 4 * 3600000) },
    { userId: USERS.nop, title: 'Incident résolu: Coupure fibre Constantine', message: 'La coupure de fibre affectant plusieurs sites à Constantine a été réparée. Tous les sites sont revenus à la normale.', type: 'success', category: 'incident', severity: 'medium', source: 'trigger', link: 'incidents', linkLabel: 'Voir l\'incident', metadata: '{"incidentId":"' + INCIDENT_IDS[2] + '"}', isRead: true, readAt: new Date(now.getTime() - 12 * 3600000), createdAt: new Date(now.getTime() - 18 * 3600000) },

    // Change request notifications
    { userId: USERS.rf, title: 'Demande de changement approuvée', message: 'Le paramètre sIntraSearch pour UMTS-OG-001 a été approuvé par le NOC Manager.', type: 'info', category: 'change', severity: 'low', source: 'trigger', link: 'changes', linkLabel: 'Voir les changements', metadata: '{"changeId":"' + CHANGE_IDS[0] + '"}', isRead: true, readAt: new Date(now.getTime() - 10 * 3600000), createdAt: new Date(now.getTime() - 14 * 3600000) },
    { userId: USERS.admin, title: 'Changement en attente de validation', message: 'Ajustement ssbPower pour NR-CN-002 nécessite votre approbation avant exécution.', type: 'warning', category: 'change', severity: 'medium', source: 'trigger', link: 'changes', linkLabel: 'Voir les changements', metadata: '{"changeId":"' + CHANGE_IDS[1] + '"}', isRead: false, createdAt: new Date(now.getTime() - 5 * 3600000) },

    // AI-related notifications
    { userId: USERS.admin, title: 'Rapport exécutif généré par IA', message: 'Un rapport de santé réseau complet a été généré automatiquement par l\'assistant IA.', type: 'info', category: 'ai', severity: 'info', source: 'ai', link: 'assistant', linkLabel: 'Voir le rapport', isRead: false, createdAt: new Date(now.getTime() - 1 * 3600000) },
    { userId: USERS.noc, title: 'Auto-rémédiation IA suggérée', message: 'L\'IA a identifié 3 actions correctives pour les alertes actives sur les sites Alger Centre.', type: 'info', category: 'ai', severity: 'medium', source: 'ai', link: 'assistant', linkLabel: 'Voir les suggestions', isRead: false, createdAt: new Date(now.getTime() - 20 * 60000) },
    { userId: USERS.rf, title: 'Corrélation d\'alertes par IA', message: 'L\'IA a identifié un groupe de 5 alertes corrélées liées à une interférence inter-cellules dans la zone Oran.', type: 'info', category: 'ai', severity: 'high', source: 'ai', link: 'assistant', linkLabel: 'Voir la corrélation', isRead: true, readAt: new Date(now.getTime() - 7 * 3600000), createdAt: new Date(now.getTime() - 8 * 3600000) },

    // Collaboration notifications
    { userId: USERS.admin, title: 'Nouveau commentaire sur incident', message: 'NOC Manager a commenté sur l\'incident "Major Outage - LTE-AL-001".', type: 'info', category: 'collaboration', severity: 'info', source: 'collaboration', link: 'incidents', linkLabel: 'Voir le commentaire', isRead: false, createdAt: new Date(now.getTime() - 10 * 60000) },
    { userId: USERS.rf, title: 'Mention dans un commentaire', message: 'Field Technician vous a mentionné dans un commentaire sur l\'alerte LTE-AL-001.', type: 'info', category: 'collaboration', severity: 'low', source: 'collaboration', link: 'alerts', linkLabel: 'Voir le commentaire', isRead: false, createdAt: new Date(now.getTime() - 40 * 60000) },

    // SLA breach notification
    { userId: USERS.admin, title: 'Violation SLA détectée', message: 'SLA de disponibilité 99.5% violé pour la région Oran (98.2% mesuré sur 7 jours).', type: 'error', category: 'alert', severity: 'high', source: 'trigger', link: 'sla', linkLabel: 'Voir le SLA', isRead: false, createdAt: new Date(now.getTime() - 6 * 3600000) },

    // Older read notifications
    { userId: USERS.noc, title: 'Simulation complétée', message: 'La simulation de scénario "Couverture 5G Alger" s\'est terminée avec succès.', type: 'success', category: 'system', severity: 'info', source: 'system', link: 'digital-twin', linkLabel: 'Voir les résultats', isRead: true, readAt: new Date(now.getTime() - 48 * 3600000), createdAt: new Date(now.getTime() - 72 * 3600000) },
    { userId: USERS.admin, title: 'Nouveau connecteur intégré', message: 'Le connecteur OSS Ericsson a été configuré avec succès. Synchronisation en cours.', type: 'success', category: 'system', severity: 'low', source: 'system', link: 'integration-hub', linkLabel: 'Voir les intégrations', isRead: true, readAt: new Date(now.getTime() - 36 * 3600000), createdAt: new Date(now.getTime() - 48 * 3600000) },
  ];
  const notifResult = [];
  for (const n of notifications) {
    notifResult.push(await db.notification.create({ data: n as any }));
  }
  console.log(`    Notifications: ${notifResult.length} (${notifResult.filter(n => !n.isRead).length} unread)`);

  // ──────────────────────────────────────────────
  // 3. Collaboration Comments (threaded)
  // ──────────────────────────────────────────────
  console.log('  Seeding CollaborationComments...');
  const comments = [
    // Thread on first alert
    { entityType: 'alert', entityId: ALERT_IDS[0], authorId: USERS.noc, authorName: 'NOC Manager', content: 'RSRP dégradé confirmé sur LTE-AL-001. J\'ai vérifié les paramètres actuels — pdschPower est à -3dB, le seuil normal est -6dB. Possible dérive.', mentions: `[]`, isResolved: false, parentId: null, createdAt: new Date(now.getTime() - 120 * 60000) },
    { entityType: 'alert', entityId: ALERT_IDS[0], authorId: USERS.rf, authorName: 'RF Engineer', content: 'Merci pour l\'info. Je vais vérifier les données de drive test récentes. Peut-être un problème d\'azimut après la dernière maintenance.', mentions: `[]`, isResolved: false, parentId: null, createdAt: new Date(now.getTime() - 100 * 60000) },
    { entityType: 'alert', entityId: ALERT_IDS[0], authorId: USERS.noc, authorName: 'NOC Manager', content: '@RF Engineer Bonne idée. Priorité haute — cette cellule dessert la zone Bab El Oued.', mentions: `["${USERS.rf}"]`, isResolved: false, parentId: null, createdAt: new Date(now.getTime() - 80 * 60000) },
    { entityType: 'alert', entityId: ALERT_IDS[0], authorId: USERS.field, authorName: 'Field Technician', content: 'Je suis sur site AL-001L demain matin. Je peux vérifier l\'antenne si nécessaire.', mentions: `[]`, isResolved: false, parentId: null, createdAt: new Date(now.getTime() - 60 * 60000) },

    // Thread on second alert
    { entityType: 'alert', entityId: ALERT_IDS[1], authorId: USERS.nop, authorName: 'NOP Engineer', content: 'Le taux de coupure 2.8% sur OR-001L est anormal. Vérification des handovers vers les cellules voisines en cours.', mentions: `[]`, isResolved: false, parentId: null, createdAt: new Date(now.getTime() - 4 * 3600000) },
    { entityType: 'alert', entityId: ALERT_IDS[1], authorId: USERS.noc, authorName: 'NOC Manager', content: 'Corrélé avec l\'incident fibre de Constantine? Les sites Oran semblent OK.', mentions: `[]`, isResolved: false, parentId: null, createdAt: new Date(now.getTime() - 3.5 * 3600000) },

    // Thread on incident 1 (outage)
    { entityType: 'incident', entityId: INCIDENT_IDS[0], authorId: USERS.noc, authorName: 'NOC Manager', content: '⚡ Incident déclaré à 14:30. Site LTE-AL-001 totalement hors service. Cause probable: coupure alimentation.', mentions: `[]`, isResolved: false, parentId: null, createdAt: new Date(now.getTime() - 5 * 3600000) },
    { entityType: 'incident', entityId: INCIDENT_IDS[0], authorId: USERS.field, authorName: 'Field Technician', content: 'Équipe de maintenance déployée. ETA sur site: 30 minutes. Groupe électrogène en transit.', mentions: `[]`, isResolved: false, parentId: null, createdAt: new Date(now.getTime() - 4.5 * 3600000) },
    { entityType: 'incident', entityId: INCIDENT_IDS[0], authorId: USERS.rf, authorName: 'RF Engineer', content: 'Redirection du trafic vers LTE-AL-002 et LTE-AL-004 en cours via ANR.', mentions: `[]`, isResolved: false, parentId: null, createdAt: new Date(now.getTime() - 4 * 3600000) },
    { entityType: 'incident', entityId: INCIDENT_IDS[0], authorId: USERS.admin, authorName: 'System Administrator', content: 'Merci à tous. Gardez-moi informé de la progression. Impact abonnés à surveiller.', mentions: `[]`, isResolved: false, parentId: null, createdAt: new Date(now.getTime() - 3.5 * 3600000) },

    // Thread on change request 1
    { entityType: 'change', entityId: CHANGE_IDS[0], authorId: USERS.rf, authorName: 'RF Engineer', content: 'Proposition de modification: sIntraSearch de 4 à 6 dB pour améliorer les handovers intra-fréquence sur UMTS-OG-001.', mentions: `[]`, isResolved: false, parentId: null, createdAt: new Date(now.getTime() - 20 * 3600000) },
    { entityType: 'change', entityId: CHANGE_IDS[0], authorId: USERS.noc, authorName: 'NOC Manager', content: 'Approuvé. Exécuter pendant la fenêtre de maintenance de 02h-04h.', mentions: `[]`, isResolved: false, parentId: null, createdAt: new Date(now.getTime() - 18 * 3600000) },
    { entityType: 'change', entityId: CHANGE_IDS[0], authorId: USERS.nop, authorName: 'NOP Engineer', content: 'Exécution planifiée. Vérification KPI post-changement prévue 4h après.', mentions: `[]`, isResolved: true, parentId: null, createdAt: new Date(now.getTime() - 16 * 3600000) },

    // Comment on site
    { entityType: 'site', entityId: SITE_IDS[0], authorId: USERS.field, authorName: 'Field Technician', content: 'Visite site effectuée hier. Alimentation OK, mais climatisation défaillante — température 42°C dans le shelter. Ticket maintenance créé.', mentions: `[]`, isResolved: false, parentId: null, createdAt: new Date(now.getTime() - 36 * 3600000) },
    { entityType: 'site', entityId: SITE_IDS[1], authorId: USERS.field, authorName: 'Field Technician', content: 'Remplacement préventif du LNB prévu la semaine prochaine.', mentions: `[]`, isResolved: false, parentId: null, createdAt: new Date(now.getTime() - 72 * 3600000) },
  ];
  const commentResult = [];
  for (const c of comments) {
    commentResult.push(await db.collaborationComment.create({ data: c as any }));
  }
  console.log(`    CollaborationComments: ${commentResult.length}`);

  // ──────────────────────────────────────────────
  // 4. Shared Annotations (map + site + KPI)
  // ──────────────────────────────────────────────
  console.log('  Seeding SharedAnnotations...');
  const annotations = [
    // Map annotations
    { entityType: 'map', entityId: null, authorId: USERS.rf, authorName: 'RF Engineer', title: 'Zone de couverture prioritaire', content: 'Extension 5G prévue Q3 2025 — besoin de 3 nouveaux sites', color: '#ef4444', position: JSON.stringify({ lat: 36.7600, lng: 3.0800 }), isVisible: true, createdAt: new Date(now.getTime() - 48 * 3600000) },
    { entityType: 'map', entityId: null, authorId: USERS.nop, authorName: 'NOP Engineer', title: 'Zone d\'interférence connue', content: 'Interférence inter-système 4G/5G détectée. Enquête en cours.', color: '#f59e0b', position: JSON.stringify({ lat: 35.7000, lng: -0.6250 }), isVisible: true, createdAt: new Date(now.getTime() - 96 * 3600000) },
    { entityType: 'map', entityId: null, authorId: USERS.admin, authorName: 'System Administrator', title: 'Projet déploiement fibre', content: 'Déploiement backbone fibre en cours — achèvement prévu septembre 2025.', color: '#22c55e', position: JSON.stringify({ lat: 36.1891, lng: 5.4082 }), isVisible: true, createdAt: new Date(now.getTime() - 120 * 3600000) },

    // Site annotations
    { entityType: 'site', entityId: SITE_IDS[0], authorId: USERS.field, authorName: 'Field Technician', title: 'Problème climatisation', content: 'Climatiseur du shelter HS. Température > 40°C. Demande d\'intervention urgente.', color: '#ef4444', position: '{}', isVisible: true, createdAt: new Date(now.getTime() - 36 * 3600000) },
    { entityType: 'site', entityId: SITE_IDS[2], authorId: USERS.rf, authorName: 'RF Engineer', title: 'Azimut à vérifier', content: 'Après le vent fort du 10 juillet, l\'azimut semble avoir dévié de 5°. Vérification physique nécessaire.', color: '#f59e0b', position: '{}', isVisible: true, createdAt: new Date(now.getTime() - 60 * 3600000) },
    { entityType: 'site', entityId: SITE_IDS[3], authorId: USERS.nop, authorName: 'NOP Engineer', title: 'Site candidat 5G', content: 'Évaluation technique positive pour le déploiement 5G. En attente de validation budget.', color: '#3b82f6', position: '{}', isVisible: true, createdAt: new Date(now.getTime() - 144 * 3600000) },

    // KPI annotation
    { entityType: 'kpi', entityId: null, authorId: USERS.noc, authorName: 'NOC Manager', title: 'Objectif Q3: Améliorer RSRP moyen', content: 'Cible: passer de -95 dBm à -90 dBm de moyenne nationale. Actions: optimisation puissance + tilt.', color: '#8b5cf6', position: '{}', isVisible: true, createdAt: new Date(now.getTime() - 168 * 3600000) },

    // Region annotation
    { entityType: 'region', entityId: null, authorId: USERS.admin, authorName: 'System Administrator', title: 'Réunion wilaya Sétif', content: 'Réunion avec la DTP Sétif le 20/07 pour discuter du déploiement rural.', color: '#06b6d4', position: JSON.stringify({ lat: 36.1891, lng: 5.4082 }), isVisible: true, createdAt: new Date(now.getTime() - 24 * 3600000) },
  ];
  const annoResult = [];
  for (const a of annotations) {
    annoResult.push(await db.sharedAnnotation.create({ data: a as any }));
  }
  console.log(`    SharedAnnotations: ${annoResult.length}`);

  console.log('\n✅ Phase 5 demo data seed complete!');
  console.log(`   UserPreferences: ${prefs.length}`);
  console.log(`   Notifications: ${notifResult.length} (${notifResult.filter(n => !n.isRead).length} unread)`);
  console.log(`   Comments: ${commentResult.length}`);
  console.log(`   Annotations: ${annoResult.length}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
