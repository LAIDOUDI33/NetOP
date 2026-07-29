#!/usr/bin/env node
/**
 * Djezzy SOC Platform - Production Environment Validator
 * 
 * Validates .env.production file for:
 * - Missing required variables
 - Default/placeholder values that need changing
 * - Invalid formats (URLs, ports, etc.)
 * - Security best practices
 * 
 * Usage: node scripts/validate-env-production.js [--fix] [--verbose]
 */

const fs = require('fs');
const path = require('path');

// Configuration categories and their required variables
const CONFIG_CATEGORIES = {
  'Core Application': {
    required: ['NODE_ENV', 'PORT', 'APP_URL', 'JWT_SECRET', 'ENCRYPTION_KEY'],
    sensitive: ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY', 'API_RATE_LIMIT_MAX']
  },
  'Database (PostgreSQL)': {
    required: ['DATABASE_URL', 'DATABASE_POOL_MIN', 'DATABASE_POOL_MAX', 'PGBOUNCER_HOST'],
    sensitive: ['DATABASE_URL']
  },
  'Redis': {
    required: ['REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD'],
    sensitive: ['REDIS_PASSWORD']
  },
  'SIEM - Wazuh': {
    required: ['WAZUH_API_URL', 'WAZUH_USERNAME', 'WAZUH_PASSWORD'],
    sensitive: ['WAZUH_PASSWORD']
  },
  'SIEM - Elasticsearch': {
    required: ['WAZUH_ES_NODES', 'WAZUH_ES_USERNAME', 'WAZUH_ES_PASSWORD'],
    sensitive: ['WAZUH_ES_PASSWORD', 'WAZUH_ES_API_KEY']
  },
  'EDR - GRR': {
    required: ['GRR_API_URL', 'GRR_USERNAME', 'GRR_PASSWORD'],
    sensitive: ['GRR_PASSWORD', 'GRR_ADMIN_PASSWORD']
  },
  'EDR - Osquery Fleet': {
    required: ['OSQUERY_FLEET_API_URL', 'OSQUERY_ENROLLMENT_SECRET'],
    sensitive: ['OSQUERY_ENROLLMENT_SECRET', 'OSQUERY_API_KEY']
  },
  'SOAR - TheHive': {
    required: ['THEHIVE_API_URL', 'THEHIVE_API_KEY'],
    sensitive: ['THEHIVE_API_KEY', 'THEHIVE_WEBHOOK_SECRET']
  },
  'SOAR - Cortex': {
    required: ['CORTEX_API_URL', 'CORTEX_API_KEY'],
    sensitive: ['CORTEX_API_KEY', 'VIRUSTOTAL_API_KEY', 'ABUSEIPDB_API_KEY']
  },
  'Threat Intel - MISP': {
    required: ['MISP_API_URL', 'MISP_API_KEY'],
    sensitive: ['MISP_API_KEY', 'MISP_SYNC_API_KEYS']
  },
  'Threat Intel - OpenCTI': {
    required: ['OPENCTI_API_URL', 'OPENCTI_API_KEY'],
    sensitive: ['OPENCTI_API_KEY']
  },
  'NSM - Suricata': {
    required: ['SURICATA_API_URL', 'SURICATA_EVE_LOG_PATH'],
    sensitive: []
  },
  'NSM - Zeek': {
    required: ['ZEEK_CONTROLLER_URL', 'ZEEK_LOG_DIRECTORY'],
    sensitive: []
  },
  'NSM - Arkime': {
    required: ['ARKIME_API_URL', 'ARKIME_API_KEY'],
    sensitive: ['ARKIME_API_KEY']
  },
  'Vulnerability - OpenVAS': {
    required: ['OPENVAS_API_URL', 'OPENVAS_USERNAME', 'OPENVAS_PASSWORD'],
    sensitive: ['OPENVAS_PASSWORD']
  },
  'Vulnerability - DefectDojo': {
    required: ['DEFECTDOJO_API_URL', 'DEFECTDOJO_API_KEY'],
    sensitive: ['DEFECTDOJO_API_KEY', 'DEFECTDOJO_WEBHOOK_SECRET']
  },
  'Kafka Event Streaming': {
    required: ['KAFKA_BROKERS', 'KAFKA_SASL_USERNAME', 'KAFKA_SASL_PASSWORD'],
    sensitive: ['KAFKA_SASL_PASSWORD', 'SCHEMA_REGISTRY_PASSWORD']
  },
  'Authentication (LDAP/SAML)': {
    required: ['LDAP_URL', 'LDAP_BIND_DN', 'LDAP_BIND_PASSWORD'],
    sensitive: ['LDAP_BIND_PASSWORD', 'SAML_PRIVATE_KEY']
  },
  'Monitoring': {
    required: ['PROMETHEUS_ENABLED', 'GRAFANA_URL', 'GRAFANA_ADMIN_PASSWORD'],
    sensitive: ['GRAFANA_ADMIN_PASSWORD', 'GRAFANA_API_KEY']
  },
  'Alerting & Notifications': {
    required: ['SMTP_HOST', 'SMTP_PASSWORD', 'PAGERDUTY_ROUTING_KEY'],
    sensitive: ['SMTP_PASSWORD', 'PAGERDUTY_ROUTING_KEY', 'SLACK_WEBHOOK_URL']
  }
};

// Patterns that indicate placeholder values
const PLACEHOLDER_PATTERNS = [
  /CHANGE_ME/i,
  /<.*>/,
  /^placeholder$/i,
  /^xxx+/i,
  /^test.*password/i,
  /^secret$/i
];

// URL validation patterns
const URL_PATTERNS = {
  apiUrl: /^https?:\/\/[a-zA-Z0-9.-]+(:\d+)?(\/.*)?$/,
  secureUrl: /^https:\/\/[a-zA-Z0-9.-]+(:\d+)?(\/.*)?$/,
  hostPort: /^[a-zA-Z0-9.-]+:\d+$/
};

class EnvValidator {
  constructor(envPath, options = {}) {
    this.envPath = envPath;
    this.options = { verbose: false, fix: false, ...options };
    this.envContent = {};
    this.errors = [];
    this.warnings = [];
    this.info = [];
    
    this.loadEnvFile();
  }

  loadEnvFile() {
    try {
      const content = fs.readFileSync(this.envPath, 'utf8');
      const lines = content.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        // Skip comments and empty lines
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
        
        this.envContent[key] = value;
      }
      
      this.info.push(`✅ Loaded ${Object.keys(this.envContent).length} environment variables`);
    } catch (error) {
      this.errors.push(`❌ Failed to load env file: ${error.message}`);
    }
  }

  validate() {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 DJEZZY SOC PLATFORM - PRODUCTION ENVIRONMENT VALIDATOR');
    console.log('   Phase 11 Enterprise Deployment Check');
    console.log('='.repeat(80) + '\n');

    // 1. Check for missing required variables
    this.checkRequiredVariables();
    
    // 2. Check for placeholder values
    this.checkPlaceholders();
    
    // 3. Validate URLs
    this.validateUrls();
    
    // 4. Check security requirements
    this.checkSecurityRequirements();
    
    // 5. Validate numeric values
    this.validateNumericValues();
    
    // 6. Generate summary
    this.printSummary();

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      info: this.info,
      score: this.calculateScore()
    };
  }

  checkRequiredVariables() {
    console.log('📋 Checking Required Variables...\n');
    
    let totalRequired = 0;
    let foundRequired = 0;

    for (const [category, config] of Object.entries(CONFIG_CATEGORIES)) {
      const missingVars = [];
      
      for (const varName of config.required) {
        totalRequired++;
        if (this.envContent[varName] !== undefined) {
          foundRequired++;
        } else {
          missingVars.push(varName);
          this.errors.push(`[${category}] Missing required variable: ${varName}`);
        }
      }

      if (this.options.verbose && missingVars.length > 0) {
        console.log(`   ⚠️  ${category}: ${missingVars.length} missing`);
        for (const v of missingVars) {
          console.log(`      - ${v}`);
        }
      }
    }

    const percentage = Math.round((foundRequired / totalRequired) * 100);
    console.log(`   ✅ Found: ${foundRequired}/${totalRequired} required variables (${percentage}%)\n`);
  }

  checkPlaceholders() {
    console.log('🔎 Checking for Placeholder Values...\n');
    
    let placeholderCount = 0;
    const placeholdersFound = [];

    for (const [key, value] of Object.entries(this.envContent)) {
      for (const pattern of PLACEHOLDER_PATTERNS) {
        if (pattern.test(value)) {
          placeholderCount++;
          placeholdersFound.push({ key, value });
          this.warnings.push(`Placeholder detected: ${key}="${value}"`);
          break;
        }
      }
    }

    if (placeholderCount > 0) {
      console.log(`   ⚠️  Found ${placeholderCount} variables with placeholder values:\n`);
      
      if (this.options.verbose) {
        for (const { key, value } of placeholdersFound) {
          console.log(`      🔑 ${key} = "${value}"`);
        }
        console.log('');
      }
    } else {
      console.log('   ✅ No placeholder values detected\n');
    }
  }

  validateUrls() {
    console.log('🌐 Validating URLs and Endpoints...\n');
    
    const urlVariables = [
      'APP_URL', 'WAZUH_API_URL', 'WAZUH_ES_NODES', 'GRR_API_URL',
      'OSQUERY_FLEET_API_URL', 'THEHIVE_API_URL', 'CORTEX_API_URL',
      'MISP_API_URL', 'OPENCTI_API_URL', 'ARKIME_API_URL',
      'OPENVAS_API_URL', 'DEFECTDOJO_API_URL', 'GRAFANA_URL',
      'KONG_PROXY_URL', 'LDAP_URL'
    ];

    let validUrls = 0;
    let invalidUrls = 0;

    for (const varName of urlVariables) {
      const value = this.envContent[varName];
      if (!value) continue;

      // For comma-separated lists (like ES nodes), check each URL
      const urls = value.split(',').map(u => u.trim());
      
      for (const url of urls) {
        if (URL_PATTERNS.apiUrl.test(url)) {
          validUrls++;
          
          // Warn if using HTTP instead of HTTPS (except for internal services)
          if (url.startsWith('http://') && !url.includes('.internal') && !url.includes('localhost')) {
            this.warnings.push(`Insecure HTTP detected: ${varName}=${url}`);
          }
        } else {
          invalidUrls++;
          this.errors.push(`Invalid URL format: ${varName}=${url}`);
        }
      }
    }

    console.log(`   ✅ Valid URLs: ${validUrls}`);
    if (invalidUrls > 0) {
      console.log(`   ❌ Invalid URLs: ${invalidUrls}\n`);
    } else {
      console.log('\n');
    }
  }

  checkSecurityRequirements() {
    console.log('🔒 Checking Security Requirements...\n');

    // Check secret strength
    const secretsToCheck = [
      'JWT_SECRET', 'ENCRYPTION_KEY', 'SESSION_SECRET',
      'REDIS_PASSWORD', 'KAFKA_SASL_PASSWORD'
    ];

    for (const secretVar of secretsToCheck) {
      const value = this.envContent[secretVar];
      if (value && value.length < 32) {
        this.errors.push(`Weak secret (${value.length} chars): ${secretVar} should be at least 32 characters`);
      }
    }

    // Check TLS settings
    if (this.envContent.NODE_ENV === 'production') {
      const tlsRequired = [
        'KAFKA_SSL_ENABLED', 'REDIS_TLS_ENABLED'
      ];

      for (const tlsVar of tlsRequired) {
        if (this.envContent[tlsVar] === 'false') {
          this.warnings.push(`TLS disabled in production: ${tlsVar}`);
        }
      }
    }

    // Check debug mode
    if (this.envContent.DEBUG_MODE === 'true' || this.envContent.DEV_MODE === 'true') {
      if (this.envContent.NODE_ENV === 'production') {
        this.errors.push('⚠️  DEBUG_MODE or DEV_MODE enabled in production!');
      }
    }

    console.log('   ✅ Security checks completed\n');
  }

  validateNumericValues() {
    console.log('🔢 Validating Numeric Values...\n');

    const numericVars = [
      { name: 'PORT', min: 1, max: 65535 },
      { name: 'REDIS_PORT', min: 1, max: 65535 },
      { name: 'DATABASE_POOL_MIN', min: 1, max: 1000 },
      { name: 'DATABASE_POOL_MAX', min: 1, max: 10000 },
      { name: 'KAFKA_TARGET_EPS', min: 1000, max: 500000 },
      { name: 'SLA_CRITICAL_HOURS', min: 1, max: 48 },
    ];

    for (const { name, min, max } of numericVars) {
      const value = parseInt(this.envContent[name]);
      if (!isNaN(value)) {
        if (value < min || value > max) {
          this.warnings.push(`${name}=${value} outside recommended range [${min}-${max}]`);
        }
      }
    }

    console.log('   ✅ Numeric validation completed\n');
  }

  calculateScore() {
    const totalChecks = 
      Object.values(CONFIG_CATEGORIES).reduce((sum, c) => sum + c.required.length, 0) + // Required vars
      20; // Additional security/format checks
    
    const passedChecks = totalChecks - this.errors.length - (this.warnings.length * 0.5);
    return Math.max(0, Math.min(100, Math.round((passedChecks / totalChecks) * 100)));
  }

  printSummary() {
    console.log('='.repeat(80));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`
   Status:         ${this.errors.length === 0 ? '✅ READY FOR DEPLOYMENT' : '❌ NEEDS ATTENTION'}
   
   Errors:         ${this.errors.length}
   Warnings:       ${this.warnings.length}
   Info Messages:  ${this.info.length}
   
   Deploy Score:   ${this.calculateScore()}%
   
   Categories Checked: ${Object.keys(CONFIG_CATEGORIES).length}
`);

    if (this.errors.length > 0) {
      console.log('   🚨 CRITICAL ERRORS (Must Fix Before Deployment):');
      console.log('   '.repeat(3) + '-'.repeat(50));
      for (const error of this.errors.slice(0, 10)) {
        console.log(`   ❌ ${error}`);
      }
      if (this.errors.length > 10) {
        console.log(`   ... and ${this.errors.length - 10} more errors`);
      }
      console.log('');
    }

    if (this.warnings.length > 0) {
      console.log('   ⚠️  WARNINGS (Recommended to Fix):');
      console.log('   '.repeat(3) + '-'.repeat(50));
      for (const warning of this.warnings.slice(0, 10)) {
        console.log(`   ⚠️  ${warning}`);
      }
      if (this.warnings.length > 10) {
        console.log(`   ... and ${this.warnings.length - 10} more warnings`);
      }
      console.log('');
    }

    console.log('='.repeat(80));

    if (this.calculateScore() >= 90) {
      console.log('🎉 Configuration looks good! Ready for deployment.');
    } else if (this.calculateScore() >= 70) {
      console.log('🔧 Almost there! Fix the errors above to proceed.');
    } else {
      console.log('🛠️  Significant configuration work needed. Start with the critical errors.');
    }

    console.log('='.repeat(80) + '\n');
  }

  generateTemplate() {
    const templatePath = this.envPath + '.template';
    const templateLines = ['# Generated Template - Fill in all values\n'];
    
    for (const [category, config] of Object.entries(CONFIG_CATEGORIES)) {
      templateLines.push(`\n# --- ${category} ---\n`);
      for (const varName of config.required) {
        templateLines.push(`${varName}=\n`);
      }
    }
    
    fs.writeFileSync(templatePath, templateLines.join('\n'));
    console.log(`📝 Template generated: ${templatePath}`);
  }
}

// Main execution
const envPath = path.join(__dirname, '..', '.env.production');
const args = process.argv.slice(2);

const validator = new EnvValidator(envPath, {
  verbose: args.includes('--verbose'),
  fix: args.includes('--fix')
});

if (args.includes('--template')) {
  validator.generateTemplate();
} else {
  const result = validator.validate();
  
  // Exit with error code if not valid
  process.exit(result.valid ? 0 : 1);
}
