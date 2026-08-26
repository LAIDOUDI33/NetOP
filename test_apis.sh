#!/bin/bash
RESULTS=""
for route in dashboard alerts faults vendors capacity config subscribers evolution correlation outages npi reports optimizer handover anomalies live coverage-holes load executive changes spectrum parameters policies vendor-compare monitoring onboarding slicing kpi benchmark coverage qoe energy incidents interference health services audit son playbooks trends sla roi; do
  code=$(curl -s -o /tmp/api_out.txt -w "%{http_code}" --max-time 20 "http://127.0.0.1:3000/api/$route" 2>/dev/null)
  if [ "$code" != "200" ]; then
    body=$(head -c 300 /tmp/api_out.txt 2>/dev/null)
    echo "FAIL $route → $code | $body"
  else
    echo "OK   $route → $code"
  fi
done