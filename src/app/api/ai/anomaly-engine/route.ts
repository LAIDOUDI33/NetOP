import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

// ── Types ──────────────────────────────────────────────────────────────

type ModelType = 'isolation_forest' | 'autoencoder' | 'lstm' | 'statistical' | 'prophet';
type ModelStatus = 'training' | 'active' | 'deprecated';
type Technology = '2G' | '3G' | '4G' | '5G';

interface MLModel {
  id: string;
  modelName: string;
  modelType: ModelType;
  technology: Technology;
  metric: string;
  status: ModelStatus;
  precision: number;
  recall: number;
  f1Score: number;
  falsePositiveRate: number;
  trainingSamples: number;
  featuresUsed: string[];
  lastTrainedAt: string;
  trainingDurationMs: number;
  detectionThreshold: number;
  autoTuneEnabled: boolean;
  totalDetections: number;
  truePositives: number;
  falsePositives: number;
  version: string;
}

// ── Feature pools per model type ───────────────────────────────────────

const FEATURE_POOLS: Record<ModelType, string[]> = {
  isolation_forest: [
    'rsrp_mean', 'rsrp_std', 'rssi_mean', 'sinr_mean', 'sinr_std',
    'handover_success_rate', 'prb_utilization', 'throughput_dl_mbps',
    'cqi_mean', 'ta_mean', 'earfcn', 'cell_availability',
    'connected_ue_count', 'drb_drop_rate', 'ho_failure_rate',
    'bler_mean', 'mcs_mean', 'rank_indicator', 'interference_power_dbm',
    'pucch_sr_count', 'pusch_prb_usage', 'pdsch_mcs_distribution',
    'neighbor_cell_count', 'frequency_offset', 'timing_advance_std',
  ],
  autoencoder: [
    'rsrp_mean', 'rsrp_std', 'rsrq_mean', 'sinr_mean', 'sinr_std',
    'throughput_dl_mbps', 'throughput_ul_mbps', 'latency_ms', 'jitter_ms',
    'packet_loss_rate', 'prb_utilization_dl', 'prb_utilization_ul',
    'connected_ue_count', 'drb_setup_fail_rate', 'bler_mean',
    'cqi_mean', 'mcs_dl_mean', 'mcs_ul_mean', 'pucch_load',
    'pdcch_cce_utilization', 'ta_distribution_skew', 'earfcn',
    'bandwidth_mhz', 'tx_power_dbm', 'noise_floor_dbm', 'interference_power_dbm',
  ],
  lstm: [
    'rsrp_t-1', 'rsrp_t-2', 'rsrp_t-3', 'rsrp_t-6', 'rsrp_t-12',
    'rsrp_t-24', 'sinr_t-1', 'sinr_t-2', 'sinr_t-6', 'sinr_t-12',
    'throughput_t-1', 'throughput_t-6', 'connected_ue_t-1',
    'connected_ue_t-6', 'prb_util_t-1', 'prb_util_t-6',
    'ho_rate_t-1', 'ho_rate_t-6', 'drop_rate_t-1', 'drop_rate_t-6',
    'hour_of_day', 'day_of_week', 'is_weekend',
    'rsrq_t-1', 'rsrq_t-6', 'latency_t-1', 'latency_t-6',
  ],
  statistical: [
    'rsrp_mean', 'rsrp_std', 'rsrp_skewness', 'rsrp_kurtosis',
    'sinr_mean', 'sinr_std', 'throughput_mean', 'throughput_std',
    'connected_ue_mean', 'connected_ue_std', 'prb_utilization_mean',
    'drop_rate_mean', 'drop_rate_std', 'ho_success_rate_mean',
    'cqi_mean', 'cqi_std', 'ta_mean', 'ta_std',
    'bler_mean', 'bler_std', 'mcs_mean', 'mcs_std',
    'packet_loss_mean', 'latency_mean', 'latency_std',
  ],
  prophet: [
    'timestamp', 'rsrp_daily_avg', 'rsrp_daily_min', 'rsrp_daily_max',
    'throughput_daily_avg', 'connected_ue_daily_avg',
    'drop_count_daily', 'ho_failure_count_daily',
    'prb_peak_utilization', 'prb_avg_utilization',
    'alert_count_daily', 'ticket_count_daily',
    'sinr_daily_avg', 'cqi_daily_avg',
    'temperature_celsius', 'humidity_pct', 'rain_mm',
    'event_flag', 'maintenance_flag', 'day_of_week', 'hour_of_day',
  ],
};

// ── Model definitions ──────────────────────────────────────────────────

function generateModels(): MLModel[] {
  const models: MLModel[] = [
    {
      id: 'mdl-ae-if-001',
      modelName: 'RSRP Anomaly Detector – Isolation Forest',
      modelType: 'isolation_forest',
      technology: '4G',
      metric: 'RSRP',
      status: 'active',
      precision: 0.942,
      recall: 0.918,
      f1Score: 0.930,
      falsePositiveRate: 0.058,
      trainingSamples: 2_450_000,
      featuresUsed: pickRandom(FEATURE_POOLS.isolation_forest, 14),
      lastTrainedAt: '2024-12-18T03:22:00Z',
      trainingDurationMs: 184_500,
      detectionThreshold: 0.62,
      autoTuneEnabled: true,
      totalDetections: 48_721,
      truePositives: 44_726,
      falsePositives: 3_995,
      version: 'v2.4.1',
    },
    {
      id: 'mdl-ae-ae-002',
      modelName: 'Throughput Autoencoder – Deep',
      modelType: 'autoencoder',
      technology: '4G',
      metric: 'Throughput',
      status: 'active',
      precision: 0.956,
      recall: 0.901,
      f1Score: 0.928,
      falsePositiveRate: 0.044,
      trainingSamples: 3_100_000,
      featuresUsed: pickRandom(FEATURE_POOLS.autoencoder, 16),
      lastTrainedAt: '2024-12-20T01:45:00Z',
      trainingDurationMs: 1_247_800,
      detectionThreshold: 0.55,
      autoTuneEnabled: true,
      totalDetections: 35_408,
      truePositives: 31_903,
      falsePositives: 3_505,
      version: 'v3.1.0',
    },
    {
      id: 'mdl-lstm-003',
      modelName: 'SINR Sequence Anomaly – BiLSTM',
      modelType: 'lstm',
      technology: '4G',
      metric: 'SINR',
      status: 'active',
      precision: 0.931,
      recall: 0.943,
      f1Score: 0.937,
      falsePositiveRate: 0.069,
      trainingSamples: 1_820_000,
      featuresUsed: pickRandom(FEATURE_POOLS.lstm, 18),
      lastTrainedAt: '2024-12-19T05:10:00Z',
      trainingDurationMs: 3_562_000,
      detectionThreshold: 0.48,
      autoTuneEnabled: true,
      totalDetections: 29_150,
      truePositives: 27_490,
      falsePositives: 1_660,
      version: 'v1.7.3',
    },
    {
      id: 'mdl-stat-004',
      modelName: 'Statistical RSRQ Deviation – Z-Score',
      modelType: 'statistical',
      technology: '3G',
      metric: 'RSRQ',
      status: 'active',
      precision: 0.878,
      recall: 0.962,
      f1Score: 0.918,
      falsePositiveRate: 0.122,
      trainingSamples: 4_200_000,
      featuresUsed: pickRandom(FEATURE_POOLS.statistical, 12),
      lastTrainedAt: '2024-11-28T14:00:00Z',
      trainingDurationMs: 12_300,
      detectionThreshold: 2.5,
      autoTuneEnabled: false,
      totalDetections: 62_340,
      truePositives: 59_971,
      falsePositives: 2_369,
      version: 'v5.0.2',
    },
    {
      id: 'mdl-proph-005',
      modelName: 'Traffic Forecast Anomaly – Prophet',
      modelType: 'prophet',
      technology: '4G',
      metric: 'PRB Utilization',
      status: 'active',
      precision: 0.914,
      recall: 0.887,
      f1Score: 0.900,
      falsePositiveRate: 0.086,
      trainingSamples: 1_050_000,
      featuresUsed: pickRandom(FEATURE_POOLS.prophet, 15),
      lastTrainedAt: '2024-12-15T22:30:00Z',
      trainingDurationMs: 890_400,
      detectionThreshold: 0.70,
      autoTuneEnabled: true,
      totalDetections: 18_920,
      truePositives: 16_786,
      falsePositives: 2_134,
      version: 'v2.0.0',
    },
    {
      id: 'mdl-ae-if-006',
      modelName: '5G Beam RSRP Isolation Forest',
      modelType: 'isolation_forest',
      technology: '5G',
      metric: 'RSRP',
      status: 'active',
      precision: 0.923,
      recall: 0.895,
      f1Score: 0.909,
      falsePositiveRate: 0.077,
      trainingSamples: 980_000,
      featuresUsed: pickRandom(FEATURE_POOLS.isolation_forest, 13),
      lastTrainedAt: '2024-12-21T00:15:00Z',
      trainingDurationMs: 142_000,
      detectionThreshold: 0.58,
      autoTuneEnabled: true,
      totalDetections: 8_415,
      truePositives: 7_531,
      falsePositives: 884,
      version: 'v1.2.0',
    },
    {
      id: 'mdl-lstm-007',
      modelName: 'Handover Failure Sequence – GRU-LSTM',
      modelType: 'lstm',
      technology: '4G',
      metric: 'Handover Success Rate',
      status: 'active',
      precision: 0.908,
      recall: 0.921,
      f1Score: 0.914,
      falsePositiveRate: 0.092,
      trainingSamples: 1_560_000,
      featuresUsed: pickRandom(FEATURE_POOLS.lstm, 16),
      lastTrainedAt: '2024-12-17T08:40:00Z',
      trainingDurationMs: 4_210_000,
      detectionThreshold: 0.52,
      autoTuneEnabled: false,
      totalDetections: 22_780,
      truePositives: 20_982,
      falsePositives: 1_798,
      version: 'v1.4.2',
    },
    {
      id: 'mdl-ae-ae-008',
      modelName: 'KPI Autoencoder – Multimetric',
      modelType: 'autoencoder',
      technology: '3G',
      metric: 'Multi-KPI',
      status: 'deprecated',
      precision: 0.845,
      recall: 0.867,
      f1Score: 0.856,
      falsePositiveRate: 0.155,
      trainingSamples: 2_800_000,
      featuresUsed: pickRandom(FEATURE_POOLS.autoencoder, 20),
      lastTrainedAt: '2024-09-10T16:20:00Z',
      trainingDurationMs: 2_180_000,
      detectionThreshold: 0.60,
      autoTuneEnabled: false,
      totalDetections: 54_200,
      truePositives: 47_000,
      falsePositives: 7_200,
      version: 'v2.1.0',
    },
    {
      id: 'mdl-stat-009',
      modelName: '2G Call Drop Statistical Monitor',
      modelType: 'statistical',
      technology: '2G',
      metric: 'Call Drop Rate',
      status: 'active',
      precision: 0.891,
      recall: 0.944,
      f1Score: 0.917,
      falsePositiveRate: 0.109,
      trainingSamples: 5_600_000,
      featuresUsed: pickRandom(FEATURE_POOLS.statistical, 10),
      lastTrainedAt: '2024-12-12T11:00:00Z',
      trainingDurationMs: 8_700,
      detectionThreshold: 3.0,
      autoTuneEnabled: false,
      totalDetections: 71_500,
      truePositives: 67_496,
      falsePositives: 4_004,
      version: 'v4.3.1',
    },
    {
      id: 'mdl-proph-010',
      modelName: '5G gNB Capacity Prophet',
      modelType: 'prophet',
      technology: '5G',
      metric: 'Connected UEs',
      status: 'training',
      precision: 0.0,
      recall: 0.0,
      f1Score: 0.0,
      falsePositiveRate: 0.0,
      trainingSamples: 420_000,
      featuresUsed: pickRandom(FEATURE_POOLS.prophet, 14),
      lastTrainedAt: '2024-12-21T06:00:00Z',
      trainingDurationMs: 0,
      detectionThreshold: 0.65,
      autoTuneEnabled: true,
      totalDetections: 0,
      truePositives: 0,
      falsePositives: 0,
      version: 'v0.1.0-alpha',
    },
  ];

  return models;
}

// ── Model Comparison ───────────────────────────────────────────────────

function generateModelComparison(models: MLModel[]) {
  const activeModels = models.filter((m) => m.status !== 'training');
  const metrics = ['precision', 'recall', 'f1Score', 'falsePositiveRate'] as const;

  const rankings: Record<string, { metric: string; bestModel: string; bestValue: number; worstModel: string; worstValue: number; avgValue: number; spread: number }[]> = {};

  for (const metric of metrics) {
    const sorted = [...activeModels].sort((a, b) => b[metric] - a[metric]);
    const values = activeModels.map((m) => m[metric]);
    const __avg = values.reduce((s, v) => s + v, 0) / values.length;

    if (!rankings[metric]) rankings[metric] = [];
    rankings[metric] = sorted.map((m, i) => ({
      modelId: m.id,
      modelName: m.modelName,
      value: m[metric],
      rank: i + 1,
    }));
  }

  const bestF1 = [...activeModels].sort((a, b) => b.f1Score - a.f1Score)[0];
  const bestPrecision = [...activeModels].sort((a, b) => b.precision - a.precision)[0];
  const bestRecall = [...activeModels].sort((a, b) => b.recall - a.recall)[0];
  const lowestFPR = [...activeModels].sort((a, b) => a.falsePositiveRate - b.falsePositiveRate)[0];
  const worstF1 = [...activeModels].sort((a, b) => a.f1Score - b.f1Score)[0];

  const avgPrecision = activeModels.reduce((s, m) => s + m.precision, 0) / activeModels.length;
  const avgRecall = activeModels.reduce((s, m) => s + m.recall, 0) / activeModels.length;
  const avgF1 = activeModels.reduce((s, m) => s + m.f1Score, 0) / activeModels.length;
  const avgFPR = activeModels.reduce((s, m) => s + m.falsePositiveRate, 0) / activeModels.length;

  return {
    overallBestModel: bestF1.modelName,
    overallBestF1: bestF1.f1Score,
    bestPrecisionModel: bestPrecision.modelName,
    bestPrecisionValue: bestPrecision.precision,
    bestRecallModel: bestRecall.modelName,
    bestRecallValue: bestRecall.recall,
    lowestFPRModel: lowestFPR.modelName,
    lowestFPRValue: lowestFPR.falsePositiveRate,
    worstPerformingModel: worstF1.modelName,
    worstF1Score: worstF1.f1Score,
    averageMetrics: {
      precision: +avgPrecision.toFixed(4),
      recall: +avgRecall.toFixed(4),
      f1Score: +avgF1.toFixed(4),
      falsePositiveRate: +avgFPR.toFixed(4),
    },
    rankings,
    modelTypeComparison: {
      isolation_forest: computeTypeStats(models, 'isolation_forest'),
      autoencoder: computeTypeStats(models, 'autoencoder'),
      lstm: computeTypeStats(models, 'lstm'),
      statistical: computeTypeStats(models, 'statistical'),
      prophet: computeTypeStats(models, 'prophet'),
    },
  };
}

function computeTypeStats(models: MLModel[], type: ModelType) {
  const typed = models.filter((m) => m.modelType === type && m.status !== 'training');
  if (typed.length === 0) return { count: 0, avgPrecision: 0, avgRecall: 0, avgF1Score: 0, avgFPR: 0 };
  return {
    count: typed.length,
    avgPrecision: +(typed.reduce((s, m) => s + m.precision, 0) / typed.length).toFixed(4),
    avgRecall: +(typed.reduce((s, m) => s + m.recall, 0) / typed.length).toFixed(4),
    avgF1Score: +(typed.reduce((s, m) => s + m.f1Score, 0) / typed.length).toFixed(4),
    avgFPR: +(typed.reduce((s, m) => s + m.falsePositiveRate, 0) / typed.length).toFixed(4),
  };
}

// ── Detection Timeline (30 days) ───────────────────────────────────────

function generateDetectionTimeline(models: MLModel[]) {
  const days: { date: string; totalDetections: number; truePositives: number; falsePositives: number; criticalAnomalies: number }[] = [];
  const activeModels = models.filter((m) => m.status === 'active');
  const dailyTotal = activeModels.reduce((s, m) => s + m.totalDetections, 0) / 30;

  for (let i = 29; i >= 0; i--) {
    const d = new Date('2024-12-21T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    // Simulate weekly pattern (more detections on weekdays)
    const dow = d.getUTCDay();
    const weekdayMultiplier = (dow === 0 || dow === 6) ? 0.7 : 1.0 + Math.random() * 0.3;
    const total = Math.floor(dailyTotal * weekdayMultiplier * (0.85 + Math.random() * 0.3));
    const fpRatio = 0.08 + Math.random() * 0.06;
    const falsePositives = Math.floor(total * fpRatio);
    const truePositives = total - falsePositives;
    const criticalAnomalies = Math.floor(truePositives * (0.04 + Math.random() * 0.06));

    days.push({ date: dateStr, totalDetections: total, truePositives, falsePositives, criticalAnomalies });
  }

  return days;
}

// ── Feature Importance (top 15) ────────────────────────────────────────

function generateFeatureImportance() {
  const features = [
    { name: 'rsrp_mean', score: 0.1872 },
    { name: 'sinr_mean', score: 0.1435 },
    { name: 'prb_utilization', score: 0.1128 },
    { name: 'throughput_dl_mbps', score: 0.0984 },
    { name: 'connected_ue_count', score: 0.0871 },
    { name: 'rsrq_mean', score: 0.0756 },
    { name: 'handover_success_rate', score: 0.0643 },
    { name: 'cqi_mean', score: 0.0521 },
    { name: 'bler_mean', score: 0.0412 },
    { name: 'latency_ms', score: 0.0335 },
    { name: 'drb_drop_rate', score: 0.0287 },
    { name: 'ta_mean', score: 0.0214 },
    { name: 'interference_power_dbm', score: 0.0178 },
    { name: 'mcs_mean', score: 0.0152 },
    { name: 'packet_loss_rate', score: 0.0122 },
  ];

  return features.map((f, i) => ({ ...f, rank: i + 1 }));
}

// ── Auto-Tuning History (10 entries) ───────────────────────────────────

function generateAutoTuningHistory() {
  return [
    {
      id: 'at-001',
      modelId: 'mdl-ae-if-001',
      modelName: 'RSRP Anomaly Detector – Isolation Forest',
      previousThreshold: 0.68,
      newThreshold: 0.62,
      reason: 'FPR exceeded 6% target — reduced threshold to lower false positives',
      f1Before: 0.918,
      f1After: 0.930,
      fprBefore: 0.072,
      fprAfter: 0.058,
      triggeredAt: '2024-12-18T03:22:45Z',
      approvedBy: 'auto',
    },
    {
      id: 'at-002',
      modelId: 'mdl-ae-ae-002',
      modelName: 'Throughput Autoencoder – Deep',
      previousThreshold: 0.50,
      newThreshold: 0.55,
      reason: 'Recall dropped below 90% — adjusted to rebalance precision/recall',
      f1Before: 0.921,
      f1After: 0.928,
      fprBefore: 0.038,
      fprAfter: 0.044,
      triggeredAt: '2024-12-20T01:46:12Z',
      approvedBy: 'auto',
    },
    {
      id: 'at-003',
      modelId: 'mdl-lstm-003',
      modelName: 'SINR Sequence Anomaly – BiLSTM',
      previousThreshold: 0.52,
      newThreshold: 0.48,
      reason: 'Missed anomalies in periodic SINR degradation — lowered for higher recall',
      f1Before: 0.929,
      f1After: 0.937,
      fprBefore: 0.061,
      fprAfter: 0.069,
      triggeredAt: '2024-12-19T05:11:30Z',
      approvedBy: 'auto',
    },
    {
      id: 'at-004',
      modelId: 'mdl-proph-005',
      modelName: 'Traffic Forecast Anomaly – Prophet',
      previousThreshold: 0.65,
      newThreshold: 0.70,
      reason: 'Holiday traffic spike caused excessive false positives',
      f1Before: 0.887,
      f1After: 0.900,
      fprBefore: 0.102,
      fprAfter: 0.086,
      triggeredAt: '2024-12-15T22:31:00Z',
      approvedBy: 'dr.ahmed',
    },
    {
      id: 'at-005',
      modelId: 'mdl-ae-if-006',
      modelName: '5G Beam RSRP Isolation Forest',
      previousThreshold: 0.52,
      newThreshold: 0.58,
      reason: 'Initial deployment calibration — FPR too high at 12%',
      f1Before: 0.882,
      f1After: 0.909,
      fprBefore: 0.118,
      fprAfter: 0.077,
      triggeredAt: '2024-12-21T00:16:20Z',
      approvedBy: 'auto',
    },
    {
      id: 'at-006',
      modelId: 'mdl-ae-if-001',
      modelName: 'RSRP Anomaly Detector – Isolation Forest',
      previousThreshold: 0.70,
      newThreshold: 0.68,
      reason: 'Seasonal RSRP variation — increased detection sensitivity',
      f1Before: 0.912,
      f1After: 0.918,
      fprBefore: 0.065,
      fprAfter: 0.072,
      triggeredAt: '2024-12-10T09:15:00Z',
      approvedBy: 'auto',
    },
    {
      id: 'at-007',
      modelId: 'mdl-lstm-007',
      modelName: 'Handover Failure Sequence – GRU-LSTM',
      previousThreshold: 0.48,
      newThreshold: 0.52,
      reason: 'Too many alerts during planned maintenance windows',
      f1Before: 0.906,
      f1After: 0.914,
      fprBefore: 0.108,
      fprAfter: 0.092,
      triggeredAt: '2024-12-17T08:41:45Z',
      approvedBy: 'auto',
    },
    {
      id: 'at-008',
      modelId: 'mdl-ae-ae-002',
      modelName: 'Throughput Autoencoder – Deep',
      previousThreshold: 0.55,
      newThreshold: 0.50,
      reason: 'Missed slow degradation pattern — temporarily lowered threshold',
      f1Before: 0.925,
      f1After: 0.921,
      fprBefore: 0.044,
      fprAfter: 0.038,
      triggeredAt: '2024-12-05T14:20:00Z',
      approvedBy: 'dr.ahmed',
    },
    {
      id: 'at-009',
      modelId: 'mdl-proph-005',
      modelName: 'Traffic Forecast Anomaly – Prophet',
      previousThreshold: 0.60,
      newThreshold: 0.65,
      reason: 'Ramadan traffic pattern shift — adjusted for seasonal change',
      f1Before: 0.878,
      f1After: 0.887,
      fprBefore: 0.115,
      fprAfter: 0.102,
      triggeredAt: '2024-12-01T20:00:00Z',
      approvedBy: 'auto',
    },
    {
      id: 'at-010',
      modelId: 'mdl-lstm-003',
      modelName: 'SINR Sequence Anomaly – BiLSTM',
      previousThreshold: 0.55,
      newThreshold: 0.52,
      reason: 'Interference event in Algiers region required higher sensitivity',
      f1Before: 0.924,
      f1After: 0.929,
      fprBefore: 0.055,
      fprAfter: 0.061,
      triggeredAt: '2024-12-13T17:30:00Z',
      approvedBy: 'auto',
    },
  ];
}

// ── Helpers ────────────────────────────────────────────────────────────

function pickRandom<T>(arr: readonly T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ── GET Handler ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    const models = generateModels();
    const activeModels = models.filter((m) => m.status === 'active');
    const totalDetections = models.reduce((s, m) => s + m.totalDetections, 0);
    const __truePositives = models.reduce((s, m) => s + m.truePositives, 0);
    const __falsePositives = models.reduce((s, m) => s + m.falsePositives, 0);

    const avgF1 = activeModels.reduce((s, m) => s + m.f1Score, 0) / activeModels.length;
    const avgPrecision = activeModels.reduce((s, m) => s + m.precision, 0) / activeModels.length;
    const avgRecall = activeModels.reduce((s, m) => s + m.recall, 0) / activeModels.length;
    const avgFPR = activeModels.reduce((s, m) => s + m.falsePositiveRate, 0) / activeModels.length;

    const modelTypes: Record<string, number> = {};
    for (const m of models) {
      modelTypes[m.modelType] = (modelTypes[m.modelType] ?? 0) + 1;
    }

    const summary = {
      totalModels: models.length,
      activeModels: activeModels.length,
      avgF1Score: +avgF1.toFixed(4),
      avgPrecision: +avgPrecision.toFixed(4),
      avgRecall: +avgRecall.toFixed(4),
      totalDetections,
      avgFalsePositiveRate: +avgFPR.toFixed(4),
      modelTypes,
    };

    const modelComparison = generateModelComparison(models);
    const detectionTimeline = generateDetectionTimeline(models);
    const featureImportance = generateFeatureImportance();
    const autoTuningHistory = generateAutoTuningHistory();

    return NextResponse.json({
      summary,
      models,
      modelComparison,
      detectionTimeline,
      featureImportance,
      autoTuningHistory,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
