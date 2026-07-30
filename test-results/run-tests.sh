#!/bin/bash
set -e

cd /home/z/my-project

# Start dev server
bun run dev > /tmp/dev-out.log 2>&1 &
SERVER_PID=$!

# Wait for server to be ready (up to 60s)
echo "Waiting for server..."
for i in $(seq 1 60); do
    if curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/health-check 2>/dev/null | grep -q '200'; then
        echo "Server ready after ${i}s"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "Server failed to start"
        tail -20 /tmp/dev-out.log
        exit 1
    fi
    sleep 1
done

OUT=/tmp/route-results3.txt
> "$OUT"

tr() {
    local m="$1" p="$2" b="$3"
    local resp
    if [ -n "$b" ]; then
        resp=$(curl -s -w '\n__ST:%{http_code} __TM:%{time_total}s' -X "$m" -H 'Content-Type: application/json' -d "$b" "http://localhost:3000$p" 2>/dev/null || echo "__ST:000 __TM:0s")
    else
        resp=$(curl -s -w '\n__ST:%{http_code} __TM:%{time_total}s' -X "$m" "http://localhost:3000$p" 2>/dev/null || echo "__ST:000 __TM:0s")
    fi
    local st=$(echo "$resp" | sed -n 's/.*__ST:\([0-9]*\).*/\1/p')
    local tm=$(echo "$resp" | sed -n 's/.*__TM:\([0-9.]*\)s.*/\1/p')
    local body=$(echo "$resp" | sed '/^__ST:/d')
    
    local rc="N/A"
    local arr=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" 2>/dev/null) && rc="$arr" || {
        echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); assert isinstance(d,dict)" 2>/dev/null && rc="object" || rc="N/A"
    }
    
    local err=""
    err=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error','') or d.get('message','') or d.get('detail',''))" 2>/dev/null | cut -c1-120)
    
    local ms=$(python3 -c "print(f'{float('$tm')*1000:.0f}')" 2>/dev/null || echo "?")
    
    echo "$m|$p|$st|$ms|$rc|$err" >> "$OUT"
}

tr GET /api/health-check
tr GET /api/dashboard
tr GET /api/alerts
tr PATCH /api/alerts '{"id":"test","status":"acknowledged"}'
tr GET /api/kpi
tr GET /api/live
tr GET /api/monitoring
tr GET /api/health
tr GET /api/coverage
tr GET /api/coverage-holes
tr GET /api/qoe
tr GET /api/sla
tr GET /api/anomalies
tr PATCH /api/anomalies '{"id":"test","status":"resolved"}'
tr POST /api/anomalies/detect '{}'
tr GET /api/incidents
tr POST /api/incidents '{"title":"Test","severity":"medium","status":"open"}'
tr PATCH /api/incidents '{"id":"test","status":"resolved"}'
tr GET /api/outages
tr GET /api/faults
tr GET /api/interference
tr GET /api/spectrum
tr GET /api/handover
tr GET /api/load
tr GET /api/energy
tr GET /api/son
tr POST /api/son '{"name":"Test Module","type":"coverage","technology":"LTE"}'
tr PATCH /api/son '{"id":"test","status":"active"}'
tr GET /api/son/actions
tr GET /api/son/neighbors
tr GET /api/parameters
tr PATCH /api/parameters '{"id":"test","value":"100"}'
tr GET /api/policies
tr POST /api/policies '{"name":"Test Policy","condition":"{}","action":"{}"}'
tr PATCH /api/policies '{"id":"test","status":"active"}'
tr GET /api/policies/executions
tr GET /api/playbooks
tr GET /api/config
tr GET /api/optimizer
tr POST /api/optimizer '{"query":"test"}'
tr GET /api/simulations
tr GET /api/subscribers
tr GET /api/trends
tr GET /api/evolution
tr GET /api/capacity
tr POST /api/capacity '{"siteId":"test","forecastMonths":6}'
tr GET /api/benchmark
tr GET /api/npi
tr GET /api/roi
tr GET /api/vendors
tr POST /api/vendors '{"name":"Test Vendor","technology":"LTE"}'
tr PATCH /api/vendors '{"id":"test","status":"active"}'
tr GET /api/vendor-compare
tr GET /api/correlation
tr GET /api/slicing
tr GET /api/services
tr GET /api/reports
tr POST /api/reports '{"type":"daily","format":"json"}'
tr GET /api/audit
tr GET /api/changes
tr GET /api/onboarding
tr POST /api/onboarding '{"siteName":"Test Site","technology":"LTE"}'
tr GET /api/executive
tr GET /api/settings/roles
tr GET /api/settings/users
tr GET /api/settings/audit
tr POST /api/assistant '{"message":"hello"}'
tr GET /api/multi-agent
tr GET /api/integration-hub
tr GET /api/data-pipeline
tr GET /api/integrations/oss
tr GET /api/integrations/crm
tr GET /api/integrations/billing
tr GET /api/

echo "Tests complete. Results in $OUT"
kill $SERVER_PID 2>/dev/null || true
