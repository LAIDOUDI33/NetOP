#!/usr/bin/env node
/**
 * Djezzy SOC Platform - Environment Configuration Merger
 * 
 * Merges generated credentials into .env.production
 * SKIPS authentication module (LDAP/SAML/MFA/Session) per user request
 * 
 * Usage: node scripts/merge-credentials-to-production.js
 */

const fs = require('fs');
const path = require('path');

// File paths
const envProductionPath = path.join(__dirname, '..', '.env.production');
const credentialsPath = path.join(__dirname, '..', '.env.credentials');
const outputPath = path.join(__dirname, '..', '.env.production.filled');

// Mapping of credential variable names to .env.production placeholder keys
const CREDENTIAL_MAPPING = {
  // Database
  'DATABASE_URL_PASSWORD': 'DATABASE_URL',
  'DATABASE_REPLICA_PASSWORD': 'DATABASE_REPLICA_URLS',
  
  // Redis
  'REDIS_PASSWORD': 'REDIS_PASSWORD',
  
  // Wazuh SIEM
  'WAZUH_PASSWORD': 'WAZUH_PASSWORD',
  'WAZUH_ES_PASSWORD': 'WAZUH_ES_PASSWORD',
  'WAZUH_ES_API_KEY': 'WAZUH_ES_API_KEY',
  'ES_PLATFORM_PASSWORD': 'ES_PASSWORD',
  
  // GRR EDR
  'GRR_PASSWORD': 'GRR_PASSWORD',
  'GRR_ADMIN_PASSWORD': 'GRR_ADMIN_PASSWORD',
  
  // Osquery Fleet
  'OSQUERY_ENROLLMENT_SECRET': 'OSQUERY_ENROLLMENT_SECRET',
  'OSQUERY_API_KEY': 'OSQUERY_API_KEY',
  
  // TheHive SOAR
  'THEHIVE_API_KEY': 'THEHIVE_API_KEY',
  'THEHIVE_WEBHOOK_SECRET': 'THEHIVE_WEBHOOK_SECRET',
  
  // Cortex SOAR
  'CORTEX_API_KEY': 'CORTEX_API_KEY',
  'VIRUSTOTAL_API_KEY': 'VIRUSTOTAL_API_KEY',
  'ABUSEIPDB_API_KEY': 'ABUSEIPDB_API_KEY',
  'IPINFO_API_KEY': 'IPINFO_API_KEY',
  
  // MISP Threat Intel
  'MISP_API_KEY': 'MISP_API_KEY',
  'MISP_SYNC_CIRCL_KEY': 'MISP_SYNC_API_KEYS',  // Special handling needed
  'MISP_SYNC_AV_KEY': 'MISP_SYNC_API_KEYS',      // Special handling needed
  
  // OpenCTI Threat Intel
  'OPENCTI_API_KEY': 'OPENCTI_API_KEY',
  
  // Suricata NSM
  'SURICATA_ET_KEY': 'SURICATA EmergingThreats_KEY',  // Has space in name
  
  // Arkime NSM
  'ARKIME_API_KEY': 'ARKIME_API_KEY',
  
  // OpenVAS Vulnerability
  'OPENVAS_PASSWORD': 'OPENVAS_PASSWORD',
  
  // DefectDojo Vulnerability
  'DEFECTDOJO_API_KEY': 'DEFECTDOJO_API_KEY',
  'DEFECTDOJO_WEBHOOK_SECRET': 'DEFECTDOJO_WEBHOOK_SECRET',
  
  // Kafka Event Streaming
  'KAFKA_SASL_PASSWORD': 'KAFKA_SASL_PASSWORD',
  'SCHEMA_REGISTRY_PASSWORD': 'SCHEMA_REGISTRY_PASSWORD',
  
  // Kong API Gateway
  'KONG_API_KEY': 'KONG_API_KEY',
  
  // Grafana Monitoring
  'GRAFANA_ADMIN_PASSWORD': 'GRAFANA_ADMIN_PASSWORD',
  'GRAFANA_API_KEY': 'GRAFANA_API_KEY',
  
  // SMTP Alerting
  'SMTP_PASSWORD': 'SMTP_PASSWORD',
  
  // PagerDuty Alerting
  'PAGERDUTY_ROUTING_KEY': 'PAGERDUTY_ROUTING_KEY',
  
  // Slack Notification
  'SLACK_WEBHOOK_TOKEN': 'SLACK_WEBHOOK_URL',  // Special handling: append to URL template
  
  // Teams Notification
  'TEAMS_WEBHOOK_TOKEN': 'TEAMS_WEBHOOK_URL',   // Special handling: append to URL template
  
  // Application Security (Non-Auth)
  'JWT_SECRET': 'JWT_SECRET',
  'JWT_REFRESH_SECRET': 'JWT_REFRESH_SECRET',
  'ENCRYPTION_KEY': 'ENCRYPTION_KEY',
  
  // Backup & Disaster Recovery
  'BACKUP_AWS_ACCESS_KEY': 'BACKUP_AWS_ACCESS_KEY',
  'BACKUP_AWS_SECRET_KEY': 'BACKUP_AWS_SECRET_KEY',
  'DB_BACKUP_ENCRYPTION_KEY': 'DB_BACKUP_ENCRYPTION_KEY'
};

// Variables to SKIP (Authentication module - to be done at final stage)
const AUTH_VARS_TO_SKIP = [
  'LDAP_URL',
  'LDAP_BIND_DN',
  'LDAP_BIND_PASSWORD',
  'LDAP_BASE_DN',
  'LDAP_USER_FILTER',
  'LDAP_GROUP_BASE_DN',
  'LDAP_GROUP_FILTER',
  'LDAP_SOC_GROUP_CN',
  'LDAP_ADMIN_GROUP_CN',
  'LDAP_TLS_CERTIFICATE',
  'SAML_ENABLED',
  'SAML_ENTRY_POINT',
  'SAML_ISSUER',
  'SAML_CERTIFICATE',
  'SAML_PRIVATE_KEY',
  'SAML_ASSERTION_CONSUMER_SERVICE_URL',
  'MFA_ENABLED',
  'MFA_ISSUER',
  'SESSION_SECRET',
  'SESSION_COOKIE_NAME'
];

function parseEnvFile(content) {
  const vars = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    
    const key = trimmed.substring(0, eqIndex).trim();
    let value = trimmed.substring(eqIndex + 1).trim();
    
    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    vars[key] = { rawLine: line, value };
  }
  
  return vars;
}

function mergeCredentials() {
  console.log('\n' + '='.repeat(80));
  console.log('🔗 DJEZZY SOC PLATFORM - CREDENTIAL MERGER');
  console.log('   Merging secure credentials into .env.production');
  console.log('='.repeat(80) + '\n');

  // Check if files exist
  if (!fs.existsSync(envProductionPath)) {
    console.error(`❌ Error: .env.production not found at ${envProductionPath}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(credentialsPath)) {
    console.error(`❌ Error: .env.credentials not found at ${credentialsPath}`);
    console.error('   Run: node scripts/generate-secure-credentials.js first');
    process.exit(1);
  }

  // Read files
  const envContent = fs.readFileSync(envProductionPath, 'utf8');
  const credContent = fs.readFileSync(credentialsPath, 'utf8');
  
  // Parse credentials
  const credentials = parseEnvFile(credContent);
  let mergedContent = envContent;
  let replacedCount = 0;
  let skippedAuthCount = 0;

  console.log('📝 Merging credentials...\n');

  for (const [credKey, credValue] of Object.entries(credentials)) {
    if (credKey.startsWith('_')) continue; // Skip metadata

    const targetKey = CREDENTIAL_MAPPING[credKey];
    if (!targetKey) {
      console.log(`   ⚠️  No mapping found for: ${credKey}`);
      continue;
    }

    // Skip authentication variables
    if (AUTH_VARS_TO_SKIP.includes(targetKey)) {
      skippedAuthCount++;
      console.log(`   🔒 Skipping auth variable: ${targetKey}`);
      continue;
    }

    // Special handling for MISP sync keys (comma-separated)
    if (credKey === 'MISP_SYNC_CIRCL_KEY') {
      const avKey = credentials['MISP_SYNC_AV_KEY']?.value || '';
      const newValue = `${credValue.value},${avKey}`;
      mergedContent = mergedContent.replace(
        /MISP_SYNC_API_KEYS=CHANGE_ME.*/,
        `MISP_SYNC_API_KEYS=${newValue}`
      );
      replacedCount++;
      console.log(`   ✅ Merged MISP sync keys`);
      continue;
    }

    // Skip AV key as it's handled above
    if (credKey === 'MISP_SYNC_AV_KEY') continue;

    // Special handling for Slack/Teams webhook URLs
    if (credKey === 'SLACK_WEBHOOK_TOKEN') {
      mergedContent = mergedContent.replace(
        /SLACK_WEBHOOK_URL=.*/,
        `SLACK_WEBHOOK_URL=https://hooks.slack.com/services/TXXXXXXXX/BXXXXXXXX/${credValue.value}`
      );
      replacedCount++;
      console.log(`   ✅ Merged Slack webhook URL`);
      continue;
    }

    if (credKey === 'TEAMS_WEBHOOK_TOKEN') {
      mergedContent = mergedContent.replace(
        /TEAMS_WEBHOOK_URL=.*/,
        `TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/${credValue.value}`
      );
      replacedCount++;
      console.log(`   ✅ Merged Teams webhook URL`);
      continue;
    }

    // Special handling for Suricata ET key (has space in name)
    if (credKey === 'SURICATA_ET_KEY') {
      mergedContent = mergedContent.replace(
        /SURICATA EmergingThreats_KEY=.*/,
        `SURICATA EmergingThreats_KEY=${credValue.value}`
      );
      replacedCount++;
      console.log(`   ✅ Merged Suricata ET key`);
      continue;
    }

    // Standard replacement: find CHANGE_ME pattern and replace with actual value
    const regex = new RegExp(`${targetKey}=.*`, 'g');
    const match = mergedContent.match(regex);
    
    if (match && match[0].includes('CHANGE_ME')) {
      mergedContent = mergedContent.replace(regex, `${targetKey}=${credValue.value}`);
      replacedCount++;
      console.log(`   ✅ Replaced: ${targetKey}`);
    } else if (match) {
      console.log(`   ℹ️  Already has value: ${targetKey} (skipping)`);
    } else {
      console.log(`   ⚠️  Not found in .env.production: ${targetKey}`);
    }
  }

  // Add header comment about auth being skipped
  const authWarning = `
# =============================================================================
# ⚠️  AUTHENTICATION MODULE NOT CONFIGURED
# =============================================================================
# Per deployment plan, LDAP/SAML/MFA/Session credentials are deferred
# to the final implementation stage of the platform.
#
# The following variables still need configuration:
${AUTH_VARS_TO_SKIP.map(v => `# - ${v}`).join('\n')}
#
# To configure authentication later:
# 1. Set up LDAP server connectivity
# 2. Obtain SAML certificates from IdP
# 3. Configure MFA provider integration
# 4. Generate session secrets
# =============================================================================\n`;

  // Insert auth warning before end of file
  mergedContent = mergedContent + authWarning;

  // Write output file
  fs.writeFileSync(outputPath, mergedContent);

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 MERGE SUMMARY');
  console.log('='.repeat(80));
  console.log(`
   Credentials Replaced: ${replacedCount}
   Auth Variables Skipped: ${skippedAuthCount}
   
   Output File: ${outputPath}
   
   Next Steps:
   1. Review the filled .env.production.filled file
   2. Test with: node scripts/validate-env-production.js --file .env.production.filled
   3. Copy to production: cp .env.production.filled /opt/soc-platform/.env.production
   
   ⚠️  Remember: Authentication module must be configured before go-live!
`);

  return { replacedCount, skippedAuthCount, outputPath };
}

// Run merger
try {
  const result = mergeCredentials();
  process.exit(0);
} catch (error) {
  console.error('❌ Merge failed:', error.message);
  process.exit(1);
}
