#!/usr/bin/env node
/**
 * Djezzy SOC Platform - Integration Connectivity Test Suite
 * Phase 11: Enterprise Production Deployment
 * 
 * Tests connectivity to all 15 open-source security tools:
 * - SIEM: Wazuh, Elasticsearch
 * - EDR: GRR, Osquery Fleet
 * - SOAR: TheHive, Cortex
 * - Threat Intel: MISP, OpenCTI
 * - NSM: Suricata, Zeek, Arkime
 * - Vulnerability: OpenVAS, DefectDojo
 * - Event Pipeline: Kafka, Schema Registry
 * - Infrastructure: PostgreSQL, Redis, Kong API Gateway
 * 
 * Usage: node scripts/test-integration-connectivity.js [--env .env.production] [--verbose] [--json]
 */

const https = require('https');
const http = require('http');
const net = require('net');
const { URL } = require('url');

// Test configuration for each integration
const INTEGRATION_TESTS = {
  // ============================================================
  // SIEM Integration (Wazuh + Elasticsearch)
  // ============================================================
  'wazuh-siem': {
    name: 'Wazuh SIEM Manager',
    category: 'SIEM',
    endpoint: process.env.WAZUH_API_URL,
    tests: [
      {
        name: 'API Health Check',
        path: '/health',
        method: 'GET',
        auth: { username: process.env.WAZUH_USERNAME, password: process.env.WAZUH_PASSWORD },
        expectedStatus: [200, 302],
        timeout: 10000
      },
      {
        name: 'API Version Check',
        path: '/',
        method: 'GET',
        auth: { username: process.env.WAZUH_USERNAME, password: process.env.WAZUH_PASSWORD },
        expectedStatus: [200],
        timeout: 10000,
        validate: (body) => {
          try {
            const data = JSON.parse(body);
            return data.versions && Object.keys(data.versions).length > 0;
          } catch {
            return false;
          }
        }
      }
    ]
  },

  'elasticsearch': {
    name: 'Elasticsearch Cluster',
    category: 'SIEM',
    endpoint: process.env.WAZUH_ES_NODES?.split(',')[0],
    tests: [
      {
        name: 'Cluster Health',
        path: '/_cluster/health?pretty',
        method: 'GET',
        auth: { username: process.env.WAZUH_ES_USERNAME, password: process.env.WAZUH_ES_PASSWORD },
        expectedStatus: [200],
        timeout: 15000,
        validate: (body) => {
          try {
            const data = JSON.parse(body);
            return ['green', 'yellow'].includes(data.status);
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Node Info',
        path: '/_nodes/stats?pretty',
        method: 'GET',
        auth: { username: process.env.WAZUH_ES_USERNAME, password: process.env.WAZUH_ES_PASSWORD },
        expectedStatus: [200],
        timeout: 15000
      }
    ]
  },

  // ============================================================
  // EDR Integration (GRR + Osquery)
  // ============================================================
  'grr-edr': {
    name: 'GRR Rapid Response',
    category: 'EDR',
    endpoint: process.env.GRR_API_URL,
    tests: [
      {
        name: 'API Health Check',
        path: '/api/v2/GetConfig',
        method: 'POST',
        auth: { username: process.env.GRR_USERNAME, password: process.env.GRR_PASSWORD },
        body: '{}',
        expectedStatus: [200],
        timeout: 30000
      },
      {
        name: 'List Clients',
        path: '/api/v2/SearchClients',
        method: 'POST',
        auth: { username: process.env.GRR_USERNAME, password: process.env.GRR_PASSWORD },
        body: '{"query":""}',
        expectedStatus: [200],
        timeout: 30000
      }
    ]
  },

  'osquery-fleet': {
    name: 'Osquery Fleet Server',
    category: 'EDR',
    endpoint: process.env.OSQUERY_FLEET_API_URL,
    tests: [
      {
        name: 'Fleet Health Check',
        path: '/api/v1/fleet/health',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${process.env.OSQUERY_API_KEY}` },
        expectedStatus: [200],
        timeout: 15000
      },
      {
        name: 'List Hosts',
        path: '/api/v1/fleet/hosts',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${process.env.OSQUERY_API_KEY}` },
        expectedStatus: [200],
        timeout: 15000
      }
    ]
  },

  // ============================================================
  // SOAR Integration (TheHive + Cortex)
  // ============================================================
  'thehive-soar': {
    name: 'TheHive Case Management',
    category: 'SOAR',
    endpoint: process.env.THEHIVE_API_URL,
    tests: [
      {
        name: 'API Health Check',
        path: '/api/status',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${process.env.THEHIVE_API_KEY}` },
        expectedStatus: [200],
        timeout: 15000
      },
      {
        name: 'List Cases',
        path: '/api/case',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${process.env.THEHIVE_API_KEY}` },
        expectedStatus: [200],
        timeout: 15000
      }
    ]
  },

  'cortex-soar': {
    name: 'Cortex Analysis Engine',
    category: 'SOAR',
    endpoint: process.env.CORTEX_API_URL,
    tests: [
      {
        name: 'API Health Check',
        path: '/api/status',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${process.env.CORTEX_API_KEY}` },
        expectedStatus: [200],
        timeout: 15000
      },
      {
        name: 'List Analyzers',
        path: '/api/analyzer',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${process.env.CORTEX_API_KEY}` },
        expectedStatus: [200],
        timeout: 15000
      }
    ]
  },

  // ============================================================
  // Threat Intelligence (MISP + OpenCTI)
  // ============================================================
  'misp-threatintel': {
    name: 'MISP Threat Intelligence',
    category: 'Threat Intel',
    endpoint: process.env.MISP_API_URL,
    tests: [
      {
        name: 'API Health Check',
        path: '/servers/getVersion',
        method: 'POST',
        headers: { 
          'Authorization': `${process.env.MISP_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: '{}',
        expectedStatus: [200],
        timeout: 15000
      },
      {
        name: 'User Info',
        path: '/users/me',
        method: 'GET',
        headers: { 
          'Authorization': `${process.env.MISP_API_KEY}`,
          'Accept': 'application/json'
        },
        expectedStatus: [200],
        timeout: 15000
      },
      {
        name: 'List Events',
        path: '/events',
        method: 'GET',
        headers: { 
          'Authorization': `${process.env.MISP_API_KEY}`,
          'Accept': 'application/json'
        },
        params: { limit: 5 },
        expectedStatus: [200],
        timeout: 20000
      }
    ]
  },

  'opencti-threatintel': {
    name: 'OpenCTI Advanced Threat Intel',
    category: 'Threat Intel',
    endpoint: process.env.OPENCTI_API_URL,
    tests: [
      {
        name: 'API Health Check',
        path: '/health',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${process.env.OPENCTI_API_KEY}` },
        expectedStatus: [200],
        timeout: 15000
      },
      {
        name: 'Token Validation',
        path: '/api/token',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: process.env.OPENCTI_API_KEY }),
        expectedStatus: [200],
        timeout: 15000
      }
    ]
  },

  // ============================================================
  // NSM Integration (Suricata + Zeek + Arkime)
  // ============================================================
  'suricata-nsm': {
    name: 'Suricata IDS/IPS',
    category: 'NSM',
    endpoint: process.env.SURICATA_API_URL,
    tests: [
      {
        name: 'API Health Check',
        path: '/health',
        method: 'GET',
        expectedStatus: [200],
        timeout: 5000
      },
      {
        name: 'Get Ruleset',
        path: '/rules',
        method: 'GET',
        expectedStatus: [200],
        timeout: 10000
      }
    ],
    tcpCheck: true  // Also do TCP connection test
  },

  'zeek-nsm': {
    name: 'Zeek Network Monitor',
    category: 'NSM',
    endpoint: process.env.ZEEK_CONTROLLER_URL,
    tests: [],
    tcpCheck: true,  // Zeek uses TCP for controller communication
    tcpPort: 5000
  },

  'arkime-nsm': {
    name: 'Arkime PCAP Analysis',
    category: 'NSM',
    endpoint: process.env.ARKIME_API_URL,
    tests: [
      {
        name: 'API Health Check',
        path: '/api/health',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${process.env.ARKIME_API_KEY}` },
        expectedStatus: [200],
        timeout: 15000
      },
      {
        name: 'Session Stats',
        path: '/api/stats',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${process.env.ARKIME_API_KEY}` },
        expectedStatus: [200],
        timeout: 15000
      }
    ]
  },

  // ============================================================
  // Vulnerability Management (OpenVAS + DefectDojo)
  // ============================================================
  'openvas-vuln': {
    name: 'OpenVAS/GVM Scanner',
    category: 'Vulnerability',
    endpoint: process.env.OPENVAS_API_URL,
    tests: [
      {
        name: 'API Health Check',
        path: '/omp',
        method: 'POST',
        auth: { username: process.env.OPENVAS_USERNAME, password: process.env.OPENVAS_PASSWORD },
        body: '<get_version/>',
        headers: { 'Content-Type': 'text/xml' },
        expectedStatus: [200],
        timeout: 30000
      },
      {
        name: 'List Tasks',
        path: '/omp',
        method: 'POST',
        auth: { username: process.env.OPENVAS_USERNAME, password: process.env.OPENVAS_PASSWORD },
        body: '<get_tasks details="0"/>',
        headers: { 'Content-Type': 'text/xml' },
        expectedStatus: [200],
        timeout: 30000
      }
    ]
  },

  'defectdojo-vuln': {
    name: 'DefectDojo Vulnerability Mgmt',
    category: 'Vulnerability',
    endpoint: process.env.DEFECTDOJO_API_URL,
    tests: [
      {
        name: 'API Health Check',
        path: '/api/v2/health',
        method: 'GET',
        headers: { 'Authorization': `Token ${process.env.DEFECTDOJO_API_KEY}` },
        expectedStatus: [200],
        timeout: 15000
      },
      {
        name: 'List Products',
        path: '/api/v2/products',
        method: 'GET',
        headers: { 'Authorization': `Token ${process.env.DEFECTDOJO_API_KEY}` },
        expectedStatus: [200],
        timeout: 15000
      }
    ]
  },

  // ============================================================
  // Event Pipeline (Kafka + Schema Registry)
  // ============================================================
  'kafka-eventstream': {
    name: 'Apache Kafka Cluster',
    category: 'Event Pipeline',
    endpoint: process.env.KAFKA_BROKERS?.split(',')[0],
    tests: [],
    tcpCheck: true,
    tcpPort: 9092
  },

  'schema-registry': {
    name: 'Confluent Schema Registry',
    category: 'Event Pipeline',
    endpoint: process.env.SCHEMA_REGISTRY_URL,
    tests: [
      {
        name: 'Registry Health',
        path: '/subjects',
        method: 'GET',
        auth: { username: process.env.SCHEMA_REGISTRY_USERNAME, password: process.env.SCHEMA_REGISTRY_PASSWORD },
        expectedStatus: [200],
        timeout: 10000
      },
      {
        name: 'Schema Config',
        path: '/config',
        method: 'GET',
        auth: { username: process.env.SCHEMA_REGISTRY_USERNAME, password: process.env.SCHEMA_REGISTRY_PASSWORD },
        expectedStatus: [200],
        timeout: 10000
      }
    ]
  },

  // ============================================================
  // Infrastructure Services
  // ============================================================
  'postgresql-database': {
    name: 'PostgreSQL Database',
    category: 'Infrastructure',
    endpoint: process.env.DATABASE_URL,
    tests: [],
    tcpCheck: true,
    extractHostFromUrl: true
  },

  'redis-cache': {
    name: 'Redis Cache',
    category: 'Infrastructure',
    endpoint: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    tests: [],
    tcpCheck: true,
    extractHostFromUrl: true
  },

  'kong-gateway': {
    name: 'Kong API Gateway',
    category: 'Infrastructure',
    endpoint: process.env.KONG_ADMIN_URL,
    tests: [
      {
        name: 'Gateway Status',
        path: '/status',
        method: 'GET',
        expectedStatus: [200],
        timeout: 5000
      },
      {
        name: 'Services List',
        path: '/services',
        method: 'GET',
        headers: { 'apikey': process.env.KONG_API_KEY },
        expectedStatus: [200],
        timeout: 10000
      }
    ]
  },

  'grafana-monitoring': {
    name: 'Grafana Monitoring',
    category: 'Monitoring',
    endpoint: process.env.GRAFANA_URL,
    tests: [
      {
        name: 'Health Check',
        path: '/api/health',
        method: 'GET',
        expectedStatus: [200],
        timeout: 10000
      },
      {
        name: 'API Authentication',
        path: '/api/user',
        method: 'GET',
        auth: { username: process.env.GRAFANA_ADMIN_USER, password: process.env.GRAFANA_ADMIN_PASSWORD },
        expectedStatus: [200],
        timeout: 10000
      }
    ]
  }
};

// Helper function to make HTTP/HTTPS requests
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const { url, method, headers, body, auth, timeout } = options;
    
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (e) {
      reject(new Error(`Invalid URL: ${url}`));
      return;
    }

    const isHttps = parsedUrl.protocol === 'https:';
    const requestLib = isHttps ? https : http;

    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + (parsedUrl.search || ''),
      method: method || 'GET',
      headers: {
        ...headers,
        'User-Agent': 'Djezzy-SOC-Platform/11.1.0',
        'Accept': 'application/json',
        ...(body && { 'Content-Type': 'application/json' })
      },
      timeout: timeout || 10000,
      rejectUnauthorized: false  // Allow self-signed certs in dev
    };

    // Add basic auth if provided
    if (auth && auth.username && auth.password) {
      const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
      requestOptions.headers['Authorization'] = `Basic ${credentials}`;
    }

    const req = requestLib.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          latency: Date.now() - options.startTime
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

// Helper function to check TCP connectivity
function checkTcpConnection(host, port, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const startTime = Date.now();
    
    socket.setTimeout(timeout);

    socket.on('connect', () => {
      const latency = Date.now() - startTime;
      socket.destroy();
      resolve({ connected: true, latency, host, port });
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error(`Connection to ${host}:${port} timed out`));
    });

    socket.on('error', (error) => {
      reject(error);
    });

    socket.connect(port, host);
  });
}

// Run a single integration test
async function runIntegrationTest(integrationId, config, verbose = false) {
  const results = {
    id: integrationId,
    name: config.name,
    category: config.category,
    status: 'unknown',
    tests: [],
    tcpCheck: null,
    errors: [],
    totalLatency: 0,
    startTime: Date.now()
  };

  try {
    // Extract host from URL if needed
    let hostForTcp = null;
    let portForTcp = null;

    if (config.extractHostFromUrl && config.endpoint) {
      try {
        const parsedUrl = new URL(config.endpoint);
        hostForTcp = parsedUrl.hostname;
        portForTcp = parseInt(parsedUrl.port) || null;
      } catch (e) {
        results.errors.push(`Failed to parse URL: ${config.endpoint}`);
      }
    }

    // TCP Connection Check (for services without HTTP API or as additional check)
    if (config.tcpCheck) {
      const tcpHost = hostForTcp || (config.endpoint ? new URL(config.endpoint).hostname : null);
      const tcpPort = portForTcp || config.tcpPort;

      if (tcpHost && tcpPort) {
        try {
          verbose && console.log(`   🔌 TCP Check: ${tcpHost}:${tcpPort}`);
          results.tcpCheck = await checkTcpConnection(tcpHost, tcpPort, 5000);
          verbose && console.log(`      ✅ Connected (${results.tcpCheck.latency}ms)`);
        } catch (error) {
          results.tcpCheck = { connected: false, error: error.message };
          results.errors.push(`TCP failed: ${error.message}`);
          verbose && console.log(`      ❌ Failed: ${error.message}`);
        }
      }
    }

    // HTTP API Tests
    if (config.tests && config.tests.length > 0 && config.endpoint) {
      for (const test of config.tests) {
        const testResult = {
          name: test.name,
          status: 'pending',
          statusText: '',
          latency: 0,
          response: null
        };

        try {
          // Build full URL
          const baseUrl = config.endpoint.replace(/\/$/, '');
          const testUrl = `${baseUrl}${test.path}${test.params ? '?' + new URLSearchParams(test.params).toString() : ''}`;
          
          verbose && console.log(`   📡 Testing: ${test.name}`);
          
          const response = await makeRequest({
            url: testUrl,
            method: test.method,
            headers: test.headers,
            body: test.body,
            auth: test.auth,
            timeout: test.timeout || 10000,
            startTime: Date.now()
          });

          testResult.response = response;
          testResult.latency = response.latency;
          results.totalLatency += response.latency;

          // Validate status code
          if (test.expectedStatus.includes(response.status)) {
            // Run custom validation if provided
            if (test.validate) {
              if (test.validate(response.body)) {
                testResult.status = 'pass';
                testResult.statusText = `✅ Passed (${response.status}, ${response.latency}ms)`;
              } else {
                testResult.status = 'fail';
                testResult.statusText = `⚠️  Validation failed (${response.status})`;
              }
            } else {
              testResult.status = 'pass';
              testResult.statusText = `✅ Passed (${response.status}, ${response.latency}ms)`;
            }
          } else {
            testResult.status = 'fail';
            testResult.statusText = `❌ Unexpected status ${response.status} (expected: ${test.expectedStatus.join(', ')})`;
          }

          verbose && console.log(`      ${testResult.statusText}`);

        } catch (error) {
          testResult.status = 'error';
          testResult.statusText = `❌ Error: ${error.message}`;
          results.errors.push(`${test.name}: ${error.message}`);
          verbose && console.log(`      ❌ Error: ${error.message}`);
        }

        results.tests.push(testResult);
      }
    }

    // Determine overall status
    if (results.tests.length === 0 && !results.tcpCheck) {
      results.status = 'no_tests';
    } else {
      const passedTests = results.tests.filter(t => t.status === 'pass').length;
      const totalTests = results.tests.length;
      const tcpOk = results.tcpCheck?.connected;

      if (passedTests === totalTests && (tcpOk || !config.tcpCheck)) {
        results.status = 'operational';
      } else if (passedTests > 0 || tcpOk) {
        results.status = 'degraded';
      } else {
        results.status = 'down';
      }
    }

  } catch (error) {
    results.status = 'error';
    results.errors.push(error.message);
  }

  results.totalTime = Date.now() - results.startTime;
  return results;
}

// Main test runner
async function runAllTests(verbose = false, jsonOutput = false) {
  console.log('\n' + '='.repeat(80));
  console.log('🔗 DJEZZY SOC PLATFORM - INTEGRATION CONNECTIVITY TEST SUITE');
  console.log('   Phase 11: Enterprise Production Deployment');
  console.log('   Testing all 15+ open-source security tool integrations');
  console.log('='.repeat(80) + '\n');

  const allResults = {};
  const summary = {
    totalIntegrations: Object.keys(INTEGRATION_TESTS).length,
    operational: 0,
    degraded: 0,
    down: 0,
    error: 0,
    no_tests: 0,
    startTime: Date.now(),
    endTime: null
  };

  // Group by category
  const categories = {};

  for (const [integrationId, config] of Object.entries(INTEGRATION_TESTS)) {
    if (!categories[config.category]) {
      categories[config.category] = [];
    }
    categories[config.category].push({ id: integrationId, config });
  }

  // Run tests by category
  for (const [category, integrations] of Object.entries(categories)) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`📁 Category: ${category.toUpperCase()}`);
    console.log('─'.repeat(80));

    for (const { id, config } of integrations) {
      console.log(`\n   🔍 Testing: ${config.name} (${id})`);
      
      const result = await runIntegrationTest(id, config, verbose);
      allResults[id] = result;

      // Update summary
      summary[result.status]++;
      
      // Print result summary
      const statusEmoji = {
        operational: '🟢',
        degraded: '🟡',
        down: '🔴',
        error: '⚫',
        no_tests: '⚪',
        unknown: '❓'
      }[result.status];

      console.log(`\n   Result: ${statusEmoji} ${result.status.toUpperCase()} (${result.totalTime}ms)`);
      
      if (result.errors.length > 0 && !verbose) {
        console.log(`   Errors:`);
        for (const error of result.errors.slice(0, 3)) {
          console.log(`      ⚠️  ${error}`);
        }
        if (result.errors.length > 3) {
          console.log(`      ... and ${result.errors.length - 3} more errors`);
        }
      }
    }
  }

  summary.endTime = Date.now();
  summary.totalTime = summary.endTime - summary.startTime;

  // Print final summary
  printSummary(summary, allResults, jsonOutput);

  return { summary, results: allResults };
}

function printSummary(summary, allResults, jsonOutput) {
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 CONNECTIVITY TEST SUMMARY');
  console.log('='.repeat(80));

  const score = Math.round((summary.operational / summary.totalIntegrations) * 100);

  console.log(`
   Total Integrations Tested: ${summary.totalIntegrations}
   
   Status Breakdown:
   ┌────────────────────────────────────┐
   │ 🟢 Operational:  ${String(summary.operational).padStart(3)} integrations     │
   │ 🟡 Degraded:     ${String(summary.degraded).padStart(3)} integrations     │
   │ 🔴 Down:         ${String(summary.down).padStart(3)} integrations     │
   │ ⚫ Errors:       ${String(summary.error).padStart(3)} integrations     │
   │ ⚪ No Tests:     ${String(summary.no_tests).padStart(3)} integrations     │
   └────────────────────────────────────┘
   
   Overall Score: ${score}%
   Test Duration: ${(summary.totalTime / 1000).toFixed(2)}s
`);

  if (score >= 90) {
    console.log('   🎉 Excellent! Platform is ready for production deployment.');
  } else if (score >= 70) {
    console.log('   👍 Good progress! A few integrations need attention.');
  } else if (score >= 50) {
    console.log('   ⚠️  Partial connectivity. Multiple services need configuration.');
  } else {
    console.log('   🚨 Critical: Most integrations are not reachable!');
  }

  console.log('\n' + '='.repeat(80));

  if (jsonOutput) {
    console.log('\n📋 JSON Output:');
    console.log(JSON.stringify({ summary, results: allResults }, null, 2));
  }
}

// CLI interface
function main() {
  const args = process.argv.slice(2);
  
  const envFlag = args.find(a => a.startsWith('--env'));
  const verbose = args.includes('--verbose');
  const jsonOutput = args.includes('--json');

  // Load environment file if specified
  if (envFlag) {
    const envFile = envFlag.split('=')[1];
    console.log(`📂 Loading environment from: ${envFile}`);
    
    try {
      const fs = require('fs');
      const content = fs.readFileSync(envFile, 'utf8');
      const lines = content.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) continue;
        
        const key = trimmed.substring(0, eqIndex).trim();
        let value = trimmed.substring(eqIndex + 1).trim();
        
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        process.env[key] = value;
      }
      
      console.log(`✅ Environment loaded successfully\n`);
    } catch (error) {
      console.error(`❌ Failed to load environment file: ${error.message}\n`);
      process.exit(1);
    }
  }

  // Run tests
  runAllTests(verbose, jsonOutput).then(({ summary }) => {
    // Exit with appropriate code
    const score = Math.round((summary.operational / summary.totalIntegrations) * 100);
    process.exit(score >= 70 ? 0 : 1);
  }).catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(2);
  });
}

// Export for testing
module.exports = { INTEGRATION_TESTS, runIntegrationTest, runAllTests };

// Run if executed directly
if (require.main === module) {
  main();
}
