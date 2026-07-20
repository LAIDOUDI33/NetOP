# Task 2: QoE/KQI Customer Experience View

## What Was Done
- Created `/src/components/views/QoEView.tsx` (860 lines) as a 'use client' component
- Wired QoE view into the application: ViewType, nav item, lazy import, renderer, title

## Component Structure
1. **Header**: "Customer Experience (QoE/KQI)" with subtitle
2. **4 KPI Cards**: Avg MOS (RadialBar gauge), Avg Satisfaction (progress bar), Total Complaints, Sites Tracked
3. **MOS by Technology**: BarChart with Cell-based per-tech coloring from TECH_COLORS
4. **Two-column grid**: Worst Sites table (top 5 by satisfaction) + Satisfaction by Tech horizontal bar chart
5. **Full Site QoE Details Table**: 14 columns, tech filter (Select), color-coded MOS/Satisfaction, sticky first 2 columns, max-h-96 scroll, clickable rows
6. **Timeline Dialog**: 3 LineCharts (MOS, Satisfaction, Data Rate) fetched per-site on row click, with loading/empty/error states

## Key Decisions
- Used `Cell` from recharts for per-bar coloring (not `<rect>`)
- Used plain `<div className="max-h-96 overflow-y-auto">` instead of ScrollArea for table containers (avoids nested scrollbar with Table's built-in overflow-x-auto)
- Computed overall MOS/Satisfaction averages client-side from site array
- MosGauge uses RadialBarChart with half-circle (180°-0°) design
- Tech filter refetches via TanStack Query queryKey ['qoe', techFilter]
- 30-second auto-refresh on summary data

## Files Modified
- `src/components/views/QoEView.tsx` — NEW (860 lines)
- `src/types/index.ts` — Added 'qoe' to ViewType union
- `src/app/page.tsx` — Added lazy import, nav item (Analytics group), view title, renderer case, HeartPulse icon

## Validation
- ESLint: 0 errors, 0 warnings
- API `/api/qoe` returns 200 with summary mode data (34 sites)
- Dev server compiles successfully
