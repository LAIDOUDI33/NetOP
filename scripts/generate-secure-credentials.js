#!/usr/bin/env node
/**
 * Djezzy SOC Platform - Secure Credential Generator
 * Phase 11: Enterprise Production Deployment
 * 
 * Generates cryptographically secure random credentials for all integrations.
 * SKIPS authentication module (LDAP/SAML/MFA/Session) - to be done at final stage.
 * 
 * Usage: node scripts/generate-secure-credentials.js [--output file] [--format env|json|k8s]
 */

const crypto = require('crypto');

// Configuration for credential generation
const CREDENTIAL_CONFIG = {
  // Database & Cache (Non-Auth)
  database: {
    password: { length: 32, charset: 'alphanumeric-special' },
    readPassword: { length: 32, charset: 'alphanumeric-special' },
  },
  redis: {
    password: { length: 64, charset: 'alphanumeric-special' },
  },

  // SIEM - Wazuh
  wazuh: {
    password: { length: 24, charset: 'alphanumeric' },
  },
  elasticsearch: {
    password: { length: 24, charset: 'alphanumeric' },
    apiKey: { length: 32, charset: 'base64url' },
    platformPassword: { length: 24, charset: 'alphanumeric' },
  },

  // EDR - GRR
  grr: {
    password: { length: 24, charset: 'alphanumeric' },
    adminPassword: { length: 32, charset: 'alphanumeric' },
  },
  osquery: {
    enrollmentSecret: { length: 48, charset: 'hex' },
    apiKey: { length: 40, charset: 'hex' },
  },

  // SOAR - TheHive & Cortex
  thehive: {
    apiKey: { length: 64, charset: 'hex' },
    webhookSecret: { length: 48, charset: 'hex' },
  },
  cortex: {
    apiKey: { length: 64, charset: 'hex' },
  },
  analyzers: {
    virusTotal: { length: 40, charset: 'hex' },  // Would be replaced with real API key
    abuseIPDB: { length: 40, charset: 'hex' },
    ipinfo: { length: 40, charset: 'hex' },
  },

  // Threat Intelligence - MISP
  misp: {
    apiKey: { length: 48, charset: 'hex' },
    syncKeys: { 
      circl: { length: 40, charset: 'hex' },
      alienVault: { length: 40, charset: 'hex' },
    },
  },

  // Threat Intelligence - OpenCTI
  opencti: {
    apiKey: { length: 64, charset: 'hex' },
  },

  // NSM - Suricata
  suricata: {
    emergingThreatsKey: { length: 16, charset: 'alphanumeric' },
  },

  // NSM - Arkime
  arkime: {
    apiKey: { length: 32, charset: 'hex' },
  },

  // Vulnerability - OpenVAS
  openvas: {
    password: { length: 24, charset: 'alphanumeric' },
  },

  // Vulnerability - DefectDojo
  defectdojo: {
    apiKey: { length: 64, charset: 'hex' },
    webhookSecret: { length: 48, charset: 'hex' },
  },

  // Kafka Event Streaming
  kafka: {
    saslPassword: { length: 32, charset: 'alphanumeric-special' },
  },
  schemaRegistry: {
    password: { length: 24, charset: 'alphanumeric' },
  },

  // API Gateway - Kong
  kong: {
    apiKey: { length: 32, charset: 'hex' },
  },

  // Monitoring - Grafana
  grafana: {
    adminPassword: { length: 24, charset: 'alphanumeric' },
    apiKey: { length: 32, charset: 'hex' },
  },

  // Alerting & Notifications
  smtp: {
    password: { length: 32, charset: 'alphanumeric-special' },
  },
  pagerduty: {
    routingKey: { length: 32, charset: 'hex' },
  },
  slack: {
    webhookUrl: { template: 'https://hooks.slack.com/services/TXXXXXXXX/BXXXXXXXX/{token}' },
  },
  teams: {
    webhookUrl: { template: 'https://outlook.office.com/webhook/{token}' },
  },

  // Application Security (Non-Auth)
  appSecurity: {
    jwtSecret: { length: 64, charset: 'alphanumeric-special' },
    jwtRefreshSecret: { length: 64, charset: 'alphanumeric-special' },
    encryptionKey: { length: 32, charset: 'hex' },
  },

  // Backup & Disaster Recovery
  backup: {
    awsAccessKey: { length: 20, charset: 'alphanumeric-special' },
    awsSecretKey: { length: 40, charset: 'alphanumeric-special' },
  },
  dbBackup: {
    encryptionKey: { length: 64, charset: 'hex' },
  },
};

// Character sets
const CHARSETS = {
  'alphanumeric': 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  'alphanumeric-special': 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?',
  'hex': '0123456789abcdef',
  'base64url': 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
  'base64': 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
};

/**
 * Generate a cryptographically secure random string
 */
function generateSecureRandom(length, charset) {
  const chars = CHARSETS[charset] || CHARSETS['alphanumeric'];
  const charsLength = chars.length;
  let result = '';
  
  // Generate random bytes
  const randomBytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % charsLength];
  }
  
  return result;
}

/**
 * Generate all credentials based on configuration
 */
function generateAllCredentials() {
  const credentials = {};
  const timestamp = new Date().toISOString();
  
  console.log('🔐 Generating secure credentials...\n');
  
  // Database Credentials
  console.log('📦 Generating Database credentials...');
  credentials.DATABASE_URL_PASSWORD = generateSecureRandom(32, 'alphanumeric-special');
  credentials.DATABASE_REPLICA_PASSWORD = generateSecureRandom(32, 'alphanumeric-special');
  
  // Redis Credentials
  console.log('🔴 Generating Redis credentials...');
  credentials.REDIS_PASSWORD = generateSecureRandom(64, 'alphanumeric-special');
  
  // Wazuh SIEM
  console.log('🛡️ Generating Wazuh SIEM credentials...');
  credentials.WAZUH_PASSWORD = generateSecureRandom(24, 'alphanumeric');
  credentials.WAZUH_ES_PASSWORD = generateSecureRandom(24, 'alphanumeric');
  credentials.WAZUH_ES_API_KEY = generateSecureRandom(32, 'base64url');
  credentials.ES_PLATFORM_PASSWORD = generateSecureRandom(24, 'alphanumeric');
  
  // GRR EDR
  console.log('🔍 Generating GRR EDR credentials...');
  credentials.GRR_PASSWORD = generateSecureRandom(24, 'alphanumeric');
  credentials.GRR_ADMIN_PASSWORD = generateSecureRandom(32, 'alphanumeric');
  
  // Osquery Fleet
  console.log('💻 Generating Osquery Fleet credentials...');
  credentials.OSQUERY_ENROLLMENT_SECRET = generateSecureRandom(48, 'hex');
  credentials.OSQUERY_API_KEY = generateSecureRandom(40, 'hex');
  
  // TheHive SOAR
  console.log('🐝 Generating TheHive SOAR credentials...');
  credentials.THEHIVE_API_KEY = generateSecureRandom(64, 'hex');
  credentials.THEHIVE_WEBHOOK_SECRET = generateSecureRandom(48, 'hex');
  
  // Cortex SOAR
  console.log('🧠 Generating Cortex SOAR credentials...');
  credentials.CORTEX_API_KEY = generateSecureRandom(64, 'hex');
  credentials.VIRUSTOTAL_API_KEY = 'VT_PLACEHOLDER_' + generateSecureRandom(20, 'hex');  // Replace with real key
  credentials.ABUSEIPDB_API_KEY = 'ABUSE_PLACEHOLDER_' + generateSecureRandom(20, 'hex');
  credentials.IPINFO_API_KEY = 'IPINFO_PLACEHOLDER_' + generateSecureRandom(20, 'hex');
  
  // MISP Threat Intel
  console.log('🎯 Generating MISP Threat Intel credentials...');
  credentials.MISP_API_KEY = generateSecureRandom(48, 'hex');
  credentials.MISP_SYNC_CIRCL_KEY = generateSecureRandom(40, 'hex');
  credentials.MISP_SYNC_AV_KEY = generateSecureRandom(40, 'hex');
  
  // OpenCTI Threat Intel
  console.log('🌐 Generating OpenCTI Threat Intel credentials...');
  credentials.OPENCTI_API_KEY = generateSecureRandom(64, 'hex');
  
  // Suricata NSM
  console.log('🌡️ Generating Suricata NSM credentials...');
  credentials.SURICATA_ET_KEY = generateSecureRandom(16, 'alphanumeric');
  
  // Arkime NSM
  console.log('🎬 Generating Arkime NSM credentials...');
  credentials.ARKIME_API_KEY = generateSecureRandom(32, 'hex');
  
  // OpenVAS Vulnerability
  console.log('🔓 Generating OpenVAS Vulnerability credentials...');
  credentials.OPENVAS_PASSWORD = generateSecureRandom(24, 'alphanumeric');
  
  // DefectDojo Vulnerability
  console.log('🥋 Generating DefectDojo Vulnerability credentials...');
  credentials.DEFECTDOJO_API_KEY = generateSecureRandom(64, 'hex');
  credentials.DEFECTDOJO_WEBHOOK_SECRET = generateSecureRandom(48, 'hex');
  
  // Kafka Event Streaming
  console.log('📨 Generating Kafka Event Streaming credentials...');
  credentials.KAFKA_SASL_PASSWORD = generateSecureRandom(32, 'alphanumeric-special');
  credentials.SCHEMA_REGISTRY_PASSWORD = generateSecureRandom(24, 'alphanumeric');
  
  // Kong API Gateway
  console.log('🚪 Generating Kong API Gateway credentials...');
  credentials.KONG_API_KEY = generateSecureRandom(32, 'hex');
  
  // Grafana Monitoring
  console.log('📊 Generating Grafana Monitoring credentials...');
  credentials.GRAFANA_ADMIN_PASSWORD = generateSecureRandom(24, 'alphanumeric');
  credentials.GRAFANA_API_KEY = generateSecureRandom(32, 'hex');
  
  // SMTP Alerting
  console.log('📧 Generating SMTP Alerting credentials...');
  credentials.SMTP_PASSWORD = generateSecureRandom(32, 'alphanumeric-special');
  
  // PagerDuty Alerting
  console.log('🔔 Generating PagerDuty Alerting credentials...');
  credentials.PAGERDUTY_ROUTING_KEY = generateSecureRandom(32, 'hex');
  
  // Slack Notification
  console.log('💬 Generating Slack Notification credentials...');
  credentials.SLACK_WEBHOOK_TOKEN = generateSecureRandom(24, 'hex');
  
  // Teams Notification
  console.log('👥 Generating Teams Notification credentials...');
  credentials.TEAMS_WEBHOOK_TOKEN = generateSecureRandom(32, 'hex');
  
  // Application Security (JWT/Encryption)
  console.log('🔒 Generating Application Security credentials...');
  credentials.JWT_SECRET = generateSecureRandom(64, 'alphanumeric-special');
  credentials.JWT_REFRESH_SECRET = generateSecureRandom(64, 'alphanumeric-special');
  credentials.ENCRYPTION_KEY = generateSecureRandom(32, 'hex');
  
  // Backup Credentials
  console.log('💾 Generating Backup credentials...');
  credentials.BACKUP_AWS_ACCESS_KEY = generateSecureRandom(20, 'alphanumeric-special');
  credentials.BACKUP_AWS_SECRET_KEY = generateSecureRandom(40, 'alphanumeric-special');
  credentials.DB_BACKUP_ENCRYPTION_KEY = generateSecureRandom(64, 'hex');
  
  credentials._generatedAt = timestamp;
  credentials._version = '11.1.0';
  credentials._note = 'Djezzy SOC Platform - Production Credentials';
  
  return credentials;
}

/**
 * Format credentials as .env file content
 */
function formatAsEnv(credentials) {
  const lines = [
    '# =============================================================================',
    '# DJEZZY NATIONAL SOC PLATFORM - GENERATED SECURE CREDENTIALS',
    '# =============================================================================',
    '# Generated: ' + credentials._generatedAt,
    '# Version: ' + credentials._version,
    '# ⚠️  KEEP THIS FILE SECURE! Contains sensitive production credentials.',
    '# ⚠️  NEVER commit to version control!',
    '#',
    '# NOTE: Authentication module (LDAP/SAML/MFA) credentials NOT included.',
    '#       These will be generated during the authentication implementation phase.',
    '# =============================================================================',
    '',
  ];

  const envMapping = {
    // Database
    DATABASE_URL_PASSWORD: 'Database user password',
    DATABASE_REPLICA_PASSWORD: 'Read replica password',
    
    // Redis
    REDIS_PASSWORD: 'Redis authentication password',
    
    // Wazuh
    WAZUH_PASSWORD: 'Wazuh API password',
    WAZUH_ES_PASSWORD: 'Elasticsearch password for Wazuh',
    WAZUH_ES_API_KEY: 'Elasticsearch API key',
    ES_PLATFORM_PASSWORD: 'Platform Elasticsearch password',
    
    // GRR
    GRR_PASSWORD: 'GRR analyst password',
    GRR_ADMIN_PASSWORD: 'GRR admin password',
    
    // Osquery
    OSQUERY_ENROLLMENT_SECRET: 'Fleet enrollment secret',
    OSQUERY_API_KEY: 'Fleet API key',
    
    // TheHive
    THEHIVE_API_KEY: 'TheHive API key',
    THEHIVE_WEBHOOK_SECRET: 'TheHive webhook secret',
    
    // Cortex
    CORTEX_API_KEY: 'Cortex API key',
    VIRUSTOTAL_API_KEY: 'VirusTotal API key (REPLACE WITH REAL)',
    ABUSEIPDB_API_KEY: 'AbuseIPDB API key (REPLACE WITH REAL)',
    IPINFO_API_KEY: 'IPInfo API key (REPLACE WITH REAL)',
    
    // MISP
    MISP_API_KEY: 'MISP API key',
    MISP_SYNC_CIRCL_KEY: 'CIRCL MISP sync key',
    MISP_SYNC_AV_KEY: 'AlienVault MISP sync key',
    
    // OpenCTI
    OPENCTI_API_KEY: 'OpenCTI API key',
    
    // Suricata
    SURICATA_ET_KEY: 'EmergingThreats rule access key',
    
    // Arkime
    ARKIME_API_KEY: 'Arkime viewer API key',
    
    // OpenVAS
    OPENVAS_PASSWORD: 'OpenVAS scanner password',
    
    // DefectDojo
    DEFECTDOJO_API_KEY: 'DefectDojo API key',
    DEFECTDOJO_WEBHOOK_SECRET: 'DefectDojo webhook secret',
    
    // Kafka
    KAFKA_SASL_PASSWORD: 'Kafka SASL password',
    SCHEMA_REGISTRY_PASSWORD: 'Schema Registry password',
    
    // Kong
    KONG_API_KEY: 'Kong API gateway key',
    
    // Grafana
    GRAFANA_ADMIN_PASSWORD: 'Grafana admin password',
    GRAFANA_API_KEY: 'Grafana API key',
    
    // SMTP
    SMTP_PASSWORD: 'SMTP server password',
    
    // PagerDuty
    PAGERDUTY_ROUTING_KEY: 'PagerDuty integration routing key',
    
    // Slack
    SLACK_WEBHOOK_TOKEN: 'Slack webhook token (append to URL)',
    
    // Teams
    TEAMS_WEBHOOK_TOKEN: 'Teams webhook token',
    
    // App Security
    JWT_SECRET: 'JWT signing secret (min 32 chars)',
    JWT_REFRESH_SECRET: 'JWT refresh token secret',
    ENCRYPTION_KEY: 'Data encryption key (32 bytes hex)',
    
    // Backup
    BACKUP_AWS_ACCESS_KEY: 'AWS S3 backup access key',
    BACKUP_AWS_SECRET_KEY: 'AWS S3 backup secret key',
    DB_BACKUP_ENCRYPTION_KEY: 'Database backup encryption key',
  };

  for (const [key, value] of Object.entries(credentials)) {
    if (key.startsWith('_')) continue; // Skip metadata
    
    const description = envMapping[key] || '';
    if (description) {
      lines.push(`# ${description}`);
    }
    lines.push(`${key}=${value}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format credentials as JSON
 */
function formatAsJson(credentials) {
  const output = { ...credentials };
  delete output._generatedAt;
  delete output._version;
  delete output._note;
  
  return JSON.stringify({
    generatedAt: credentials._generatedAt,
    version: credentials._version,
    note: credentials._note,
    credentials: output
  }, null, 2);
}

/**
 * Format credentials as Kubernetes Secret manifest
 */
function formatAsK8sSecret(credentials, namespace = 'soc-platform') {
  const secretData = {};
  
  const k8sMapping = {
    'database-password': credentials.DATABASE_URL_PASSWORD,
    'database-replica-password': credentials.DATABASE_REPLICA_PASSWORD,
    'redis-password': credentials.REDIS_PASSWORD,
    'wazuh-password': credentials.WAZUH_PASSWORD,
    'wazuh-es-password': credentials.WAZUH_ES_PASSWORD,
    'wazuh-es-api-key': credentials.WAZUH_ES_API_KEY,
    'es-platform-password': credentials.ES_PLATFORM_PASSWORD,
    'grr-password': credentials.GRR_PASSWORD,
    'grr-admin-password': credentials.GRR_ADMIN_PASSWORD,
    'osquery-enrollment-secret': credentials.OSQUERY_ENROLLMENT_SECRET,
    'osquery-api-key': credentials.OSQUERY_API_KEY,
    'thehive-api-key': credentials.THEHIVE_API_KEY,
    'thehive-webhook-secret': credentials.THEHIVE_WEBHOOK_SECRET,
    'cortex-api-key': credentials.CORTEX_API_KEY,
    'misp-api-key': credentials.MISP_API_KEY,
    'opencti-api-key': credentials.OPENCTI_API_KEY,
    'arkime-api-key': credentials.ARKIME_API_KEY,
    'openvas-password': credentials.OPENVAS_PASSWORD,
    'defectdojo-api-key': credentials.DEFECTDOJO_API_KEY,
    'defectdojo-webhook-secret': credentials.DEFECTDOJO_WEBHOOK_SECRET,
    'kafka-sasl-password': credentials.KAFKA_SASL_PASSWORD,
    'schema-registry-password': credentials.SCHEMA_REGISTRY_PASSWORD,
    'kong-api-key': credentials.KONG_API_KEY,
    'grafana-admin-password': credentials.GRAFANA_ADMIN_PASSWORD,
    'grafana-api-key': credentials.GRAFANA_API_KEY,
    'smtp-password': credentials.SMTP_PASSWORD,
    'pagerduty-routing-key': credentials.PAGERDUTY_ROUTING_KEY,
    'jwt-secret': credentials.JWT_SECRET,
    'jwt-refresh-secret': credentials.JWT_REFRESH_SECRET,
    'encryption-key': credentials.ENCRYPTION_KEY,
    'backup-aws-access-key': credentials.BACKUP_AWS_ACCESS_KEY,
    'backup-aws-secret-key': credentials.BACKUP_AWS_SECRET_KEY,
    'db-backup-encryption-key': credentials.DB_BACKUP_ENCRYPTION_KEY,
  };

  // Base64 encode all values for Kubernetes
  for (const [key, value] of Object.entries(k8sMapping)) {
    if (value) {
      secretData[key] = Buffer.from(value).toString('base64');
    }
  }

  const manifest = {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: 'soc-platform-credentials',
      namespace: namespace,
      labels: {
        app: 'soc-platform',
        component: 'credentials',
        managedBy: 'soc-platform',
        sensitivity: 'critical'
      },
      annotations: {
        'generated-at': new Date().toISOString(),
        'version': '11.1.0',
        'purpose': 'Production credentials for Djezzy SOC Platform integrations'
      }
    },
    type: 'Opaque',
    data: secretData
  };

  return `# =============================================================================
# Kubernetes Secret Manifest - Djezzy SOC Platform Credentials
# =============================================================================
# Namespace: ${namespace}
# Secret Name: soc-platform-credentials
# Generated: ${new Date().toISOString()}
#
# ⚠️  SECURITY NOTICE:
# - This file contains base64-encoded secrets (NOT encrypted!)
# - Apply only to secure Kubernetes clusters with RBAC enabled
# - Use sealed-secrets or external secrets operator in production
# - NEVER commit this file to public repositories
# =============================================================================

${JSON.stringify(manifest, null, 2)}
`;
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const outputFlag = args.find(a => a.startsWith('--output'));
  const formatFlag = args.find(a => a.startsWith('--format')) || '--format=env';
  
  const format = formatFlag.split('=')[1] || 'env';
  const outputFile = outputFlag ? outputFlag.split('=')[1] : null;

  console.log('\n' + '='.repeat(80));
  console.log('🔐 DJEZZY SOC PLATFORM - SECURE CREDENTIAL GENERATOR');
  console.log('   Phase 11: Enterprise Production Deployment');
  console.log('='.repeat(80) + '\n');

  // Generate all credentials
  const credentials = generateAllCredentials();

  // Format output based on requested format
  let output;
  let extension;

  switch (format.toLowerCase()) {
    case 'json':
      output = formatAsJson(credentials);
      extension = '.json';
      break;
    case 'k8s':
    case 'kubernetes':
    case 'yaml':
      output = formatAsK8sSecret(credentials);
      extension = '-k8s.yaml';
      break;
    case 'env':
    default:
      output = formatAsEnv(credentials);
      extension = '.env.credentials';
      break;
  }

  // Output to file or stdout
  if (outputFile) {
    const fs = require('fs');
    fs.writeFileSync(outputFile, output);
    console.log(`\n✅ Credentials written to: ${outputFile}`);
    console.log(`   Format: ${format.toUpperCase()}`);
    console.log(`   Variables: ${Object.keys(credentials).filter(k => !k.startsWith('_')).length}\n`);
  } else {
    console.log('\n' + output);
  }

  // Print summary
  console.log('📊 Credential Generation Summary:');
  console.log('   '.repeat(4) + '-'.repeat(50));
  console.log(`   Total Credentials Generated: ${Object.keys(credentials).filter(k => !k.startsWith('_')).length}`);
  console.log(`   Format: ${format.toUpperCase()}`);
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  console.log('');
  console.log('⚠️  IMPORTANT REMINDERS:');
  console.log('   • Store these credentials in a secure vault (HashiCorp Vault, AWS Secrets Manager)');
  console.log('   • Rotate credentials every 90 days');
  console.log('   • Never share via email or chat');
  console.log('   • Authentication module credentials (LDAP/SAML/MFA) NOT included');
  console.log('');

  return credentials;
}

// Export for testing
module.exports = { generateAllCredentials, formatAsEnv, formatAsJson, formatAsK8sSecret };

// Run if executed directly
if (require.main === module) {
  main();
}
