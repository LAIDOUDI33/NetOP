#!/bin/bash
# Start server and test everything in one go
cd /home/z/my-project

# Kill any existing
pkill -f "next-server" 2>/dev/null
pkill -f "next dev" 2>/dev/null
sleep 2

# Start server
nohup bun run dev > /home/z/my-project/dev.log 2>&1 &
disown
sleep 12

echo "=== MAIN ROUTES ==="
PASS=0
FAIL=0
for route in dashboard alerts faults vendors capacity config subscribers evolution correlation outages npi reports optimizer handover anomalies live coverage-holes load executive changes spectrum parameters policies vendor-compare monitoring onboarding slicing kpi benchmark coverage qoe energy incidents interference health services audit son playbooks trends sla roi; do
  code=$(curl -s -o /tmp/api_out.txt -w "%{http_code}" --max-time 25 "http://127.0.0.1:3000/api/$route" 2>/dev/null)
  if [ "$code" != "200" ]; then
    body=$(head -c 200 /tmp/api_out.txt 2>/dev/null)
    echo "FAIL $route → $code | $body"
    FAIL=$((FAIL+1))
  else
    echo "OK   $route → $code"
    PASS=$((PASS+1))
  fi
done

echo ""
echo "=== SUB-ROUTES ==="
for route in "son/actions" "son/neighbors" "policies/executions" "anomalies/detect"; do
  code=$(curl -s -o /tmp/api_out.txt -w "%{http_code}" --max-time 25 "http://127.0.0.1:3000/api/$route" 2>/dev/null)
  if [ "$code" != "200" ]; then
    body=$(head -c 200 /tmp/api_out.txt 2>/dev/null)
    echo "FAIL $route → $code | $body"
    FAIL=$((FAIL+1))
  else
    echo "OK   $route → $code"
    PASS=$((PASS+1))
  fi
done

echo ""
echo "=== QUERY PARAM ROUTES ==="
for route in "alerts?severity=critical&resolved=false" "alerts?resolved=false"; do
  code=$(curl -s -o /tmp/api_out.txt -w "%{http_code}" --max-time 25 "http://127.0.0.1:3000/api/$route" 2>/dev/null)
  if [ "$code" != "200" ]; then
    body=$(head -c 200 /tmp/api_out.txt 2>/dev/null)
    echo "FAIL $route → $code | $body"
    FAIL=$((FAIL+1))
  else
    echo "OK   $route → $code"
    PASS=$((PASS+1))
  fi
done

echo ""
echo "=== POST ENDPOINTS ==="
for ep in "alerts" "policies/executions" "son/actions" "anomalies/detect"; do
  code=$(curl -s -o /tmp/api_out.txt -w "%{http_code}" --max-time 25 -X POST -H "Content-Type: application/json" -d '{}' "http://127.0.0.1:3000/api/$ep" 2>/dev/null)
  body=$(head -c 200 /tmp/api_out.txt 2>/dev/null)
  echo "POST $ep → $code | $body"
  if [ "$code" == "200" ] || [ "$code" == "201" ] || [ "$code" == "400" ] || [ "$code" == "401" ] || [ "$code" == "405" ]; then
    PASS=$((PASS+1))
  else
    FAIL=$((FAIL+1))
  fi
done

echo ""
echo "=== AUTH ENDPOINTS ==="
for ep in "auth/csrf" "auth/session" "auth/providers" "auth/seed"; do
  code=$(curl -s -o /tmp/api_out.txt -w "%{http_code}" --max-time 15 "http://127.0.0.1:3000/api/$ep" 2>/dev/null)
  echo "GET $ep → $code"
  if [ "$code" == "200" ] || [ "$code" == "201" ]; then
    PASS=$((PASS+1))
  else
    FAIL=$((FAIL+1))
  fi
done

echo ""
echo "=== PAGE ==="
code=$(curl -s -o /tmp/api_out.txt -w "%{http_code}" --max-time 60 "http://127.0.0.1:3000/" 2>/dev/null)
echo "GET / → $code"
if [ "$code" == "200" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi

echo ""
echo "=========================================="
echo "RESULTS: $PASS passed, $FAIL failed"
echo "=========================================="