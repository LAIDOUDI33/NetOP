#!/bin/bash
# Test sub-routes and POST endpoints
echo "=== SUB-ROUTES ==="
for route in "alerts?severity=critical&resolved=false" "son/actions" "son/neighbors" "policies/executions" "anomalies/detect"; do
  code=$(curl -s -o /tmp/api_out.txt -w "%{http_code}" --max-time 20 "http://127.0.0.1:3000/api/$route" 2>/dev/null)
  if [ "$code" != "200" ]; then
    body=$(head -c 300 /tmp/api_out.txt 2>/dev/null)
    echo "FAIL $route → $code | $body"
  else
    echo "OK   $route → $code"
  fi
done

echo ""
echo "=== POST ENDPOINTS ==="
# Test POST to alerts (acknowledge)
code=$(curl -s -o /tmp/api_out.txt -w "%{http_code}" --max-time 20 -X POST -H "Content-Type: application/json" -d '{"alertId":"test"}' "http://127.0.0.1:3000/api/alerts" 2>/dev/null)
body=$(head -c 200 /tmp/api_out.txt 2>/dev/null)
echo "POST /api/alerts → $code | $body"

# Test POST to policies/executions
code=$(curl -s -o /tmp/api_out.txt -w "%{http_code}" --max-time 20 -X POST -H "Content-Type: application/json" -d '{"policyId":"test"}' "http://127.0.0.1:3000/api/policies/executions" 2>/dev/null)
body=$(head -c 200 /tmp/api_out.txt 2>/dev/null)
echo "POST /api/policies/executions → $code | $body"

# Test POST to son/actions
code=$(curl -s -o /tmp/api_out.txt -w "%{http_code}" --max-time 20 -X POST -H "Content-Type: application/json" -d '{"action":"test"}' "http://127.0.0.1:3000/api/son/actions" 2>/dev/null)
body=$(head -c 200 /tmp/api_out.txt 2>/dev/null)
echo "POST /api/son/actions → $code | $body"

# Test POST to anomalies/detect
code=$(curl -s -o /tmp/api_out.txt -w "%{http_code}" --max-time 20 -X POST -H "Content-Type: application/json" -d '{}' "http://127.0.0.1:3000/api/anomalies/detect" 2>/dev/null)
body=$(head -c 200 /tmp/api_out.txt 2>/dev/null)
echo "POST /api/anomalies/detect → $code | $body"

# Test auth endpoints
echo ""
echo "=== AUTH ENDPOINTS ==="
code=$(curl -s -o /tmp/api_out.txt -w "%{http_code}" --max-time 10 "http://127.0.0.1:3000/api/auth/csrf" 2>/dev/null)
echo "GET /api/auth/csrf → $code"

code=$(curl -s -o /tmp/api_out.txt -w "%{http_code}" --max-time 10 "http://127.0.0.1:3000/api/auth/session" 2>/dev/null)
echo "GET /api/auth/session → $code"

code=$(curl -s -o /tmp/api_out.txt -w "%{http_code}" --max-time 10 "http://127.0.0.1:3000/api/auth/providers" 2>/dev/null)
echo "GET /api/auth/providers → $code"

# Test main page
echo ""
echo "=== PAGE ROUTES ==="
code=$(curl -s -o /tmp/api_out.txt -w "%{http_code}" --max-time 30 "http://127.0.0.1:3000/" 2>/dev/null)
echo "GET / → $code"