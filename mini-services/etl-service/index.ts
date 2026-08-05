import { prisma } from "./prisma";

const PORT = 3010;
const STARTED_AT = Date.now();

// Track how many pipelines are being monitored (updated each cycle)
let pipelinesMonitored = 0;

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function randomMs(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function jsonRes(
  status: number,
  body: unknown,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

function parseBody(req: Request): Promise<Record<string, unknown>> {
  return req.json() as Promise<Record<string, unknown>>;
}

// Simple cron check: returns true if the pipeline's nextRun is due or past
function isDue(pipeline: { nextRun: Date | null; schedule: string }): boolean {
  if (pipeline.nextRun) {
    return new Date(pipeline.nextRun) <= new Date();
  }
  // If no nextRun set, use schedule as a simple interval hint
  // Parse basic cron: "*/N * * * *" means every N minutes
  return false;
}

/** Parse a cron expression and return next run Date. */
function computeNextRun(cronExpr: string, from: Date = new Date()): Date {
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length < 5) return new Date(from.getTime() + 30_000); // fallback 30s

  const minute = parts[0];
  const hour = parts[1];
  const dayOfMonth = parts[2];
  const month = parts[3];
  const dayOfWeek = parts[4];

  const d = new Date(from);
  d.setSeconds(0, 0);

  // Handle "*/N" minute pattern
  const everyMinMatch = minute.match(/^\*\/([0-9]+)$/);
  if (everyMinMatch) {
    const interval = parseInt(everyMinMatch[1], 10);
    d.setMinutes(d.getMinutes() + interval);
    return d;
  }

  // Handle fixed minute
  const fixedMin = parseInt(minute, 10);
  if (!isNaN(fixedMin)) {
    d.setMinutes(fixedMin, 0, 0);
    if (d <= from) {
      // Advance to next occurrence
      if (hour !== "*" && hour !== "0") {
        d.setHours(d.getHours() + 1);
      } else if (dayOfMonth !== "*" || dayOfWeek !== "*") {
        d.setDate(d.getDate() + 1);
      } else {
        d.setMinutes(d.getMinutes() + 1);
      }
    }
    return d;
  }

  // Fallback: 30 seconds from now
  return new Date(from.getTime() + 30_000);
}

// ══════════════════════════════════════════════════════════════════════════════
// PIPELINE EXECUTION ENGINE
// ══════════════════════════════════════════════════════════════════════════════

async function executePipeline(
  pipelineId: string,
  triggerType: string,
  retryCount: number = 0,
): Promise<string | null> {
  const pipeline = await prisma.dataPipeline.findUnique({
    where: { id: pipelineId },
  });
  if (!pipeline) return `Pipeline ${pipelineId} not found`;

  const startTime = Date.now();

  // 1. Create execution record
  const execution = await prisma.pipelineExecution.create({
    data: {
      pipelineId,
      status: "running",
      triggerType,
      retryCount,
      maxRetries: pipeline.retryMaxAttempts,
      startedAt: new Date(),
    },
  });

  console.log(
    `[ETL] ▶ Pipeline "${pipeline.name}" (exec: ${execution.id}) trigger=${triggerType} retry=${retryCount}`,
  );

  // 2. Parse transformation steps
  let steps: Array<{ name: string; type: string; config?: Record<string, unknown> }> = [];
  try {
    steps = JSON.parse(pipeline.transformationSteps || "[]");
  } catch {
    steps = [];
  }
  if (steps.length === 0) {
    steps = [
      { name: "extract", type: "extract" },
      { name: "transform", type: "transform" },
      { name: "load", type: "load" },
    ];
  }

  // 3. Simulate ETL steps
  const stepResults: Array<{
    step: string;
    status: string;
    recordsIn: number;
    recordsOut: number;
    durationMs: number;
  }> = [];

  let totalRecordsIn = 0;
  let totalRecordsOut = 0;
  let totalRecordsErr = 0;
  let failed = false;
  let errorMsg: string | null = null;

  for (const step of steps) {
    const duration = randomMs(500, 5000);
    await sleep(duration);

    const recordsIn = randomMs(800, 5000);
    const errorRate = Math.random() < 0.1 ? Math.random() * 0.05 : 0;
    const recordsError = Math.floor(recordsIn * errorRate);
    const recordsOut = recordsIn - recordsError;

    // 10% chance a step fails (overall pipeline failure)
    if (Math.random() < 0.1) {
      failed = true;
      errorMsg = `Step "${step.name}" failed: simulated ${step.type} error (timeout in upstream ${pipeline.source})`;
      stepResults.push({
        step: step.name,
        status: "failed",
        recordsIn,
        recordsOut: 0,
        durationMs: duration,
      });
      totalRecordsIn += recordsIn;
      totalRecordsErr += recordsError;
      break;
    }

    stepResults.push({
      step: step.name,
      status: "succeeded",
      recordsIn,
      recordsOut,
      durationMs: duration,
    });

    totalRecordsIn += recordsIn;
    totalRecordsOut += recordsOut;
    totalRecordsErr += recordsError;
  }

  const endTime = Date.now();
  const durationMs = endTime - startTime;
  const finalStatus = failed ? "failed" : "succeeded";
  const errorRateVal = totalRecordsIn > 0 ? totalRecordsErr / totalRecordsIn : 0;

  // 4. Update execution record
  await prisma.pipelineExecution.update({
    where: { id: execution.id },
    data: {
      status: finalStatus,
      completedAt: new Date(),
      durationMs,
      recordsIn: totalRecordsIn,
      recordsOut: totalRecordsOut,
      recordsError: totalRecordsErr,
      errorRate: errorRateVal,
      errorMessage: errorMsg,
      stepResults: JSON.stringify(stepResults),
    },
  });

  // 5. Update parent pipeline stats
  const isNewAvg =
    pipeline.avgDurationMs === 0
      ? durationMs
      : Math.round(
          (pipeline.avgDurationMs * pipeline.totalRuns + durationMs) /
            (pipeline.totalRuns + 1),
        );

  await prisma.dataPipeline.update({
    where: { id: pipelineId },
    data: {
      totalRuns: pipeline.totalRuns + 1,
      successRuns:
        pipeline.successRuns + (finalStatus === "succeeded" ? 1 : 0),
      failedRuns:
        pipeline.failedRuns + (finalStatus === "failed" ? 1 : 0),
      recordsProcessed: pipeline.recordsProcessed + totalRecordsOut,
      errorRate: errorRateVal,
      avgDurationMs: isNewAvg,
      totalRecordsIn: pipeline.totalRecordsIn + totalRecordsIn,
      totalRecordsOut: pipeline.totalRecordsOut + totalRecordsOut,
      totalRecordsErr: pipeline.totalRecordsErr + totalRecordsErr,
      lastRun: new Date(),
      nextRun: computeNextRun(pipeline.schedule, new Date()),
    },
  });

  console.log(
    `[ETL] ✔ Pipeline "${pipeline.name}" → ${finalStatus} in ${durationMs}ms (${totalRecordsOut} records)` +
      (errorMsg ? ` | ERROR: ${errorMsg}` : ""),
  );

  // 6. Handle retry on failure
  if (failed && retryCount < pipeline.retryMaxAttempts) {
    console.log(
      `[ETL] ↻ Retrying "${pipeline.name}" in ${pipeline.retryDelayMs}ms (attempt ${retryCount + 1}/${pipeline.retryMaxAttempts})`,
    );
    setTimeout(() => {
      executePipeline(pipelineId, "retry", retryCount + 1).catch((err) => {
        console.error(`[ETL] Retry error for "${pipeline.name}":`, err);
      });
    }, pipeline.retryDelayMs);
  }

  // 7. Run quality evaluation after execution
  await evaluateQuality(pipeline.target, pipelineId, execution.id);

  return null; // null = success
}

// ══════════════════════════════════════════════════════════════════════════════
// QUALITY EVALUATOR
// ══════════════════════════════════════════════════════════════════════════════

async function evaluateQuality(
  targetModel: string | null,
  pipelineId: string | null,
  executionId: string | null,
) {
  if (!targetModel) return;

  const rules = await prisma.dataQualityRule.findMany({
    where: {
      isEnabled: true,
      targetModel,
    },
  });

  if (rules.length === 0) return;

  console.log(
    `[Quality] Evaluating ${rules.length} rule(s) for target "${targetModel}"`,
  );

  for (const rule of rules) {
    let passed = false;
    let actualValue = 0;
    let expectedValue = 100;
    const details: Record<string, unknown> = {
      ruleName: rule.name,
      ruleType: rule.ruleType,
      targetModel,
    };

    try {
      let config: Record<string, unknown> = {};
      try {
        config = JSON.parse(rule.ruleConfig || "{}");
      } catch {
        // empty config
      }

      const threshold = (config.threshold as number) ?? 95;
      const field = (config.field as string) || "*";

      // Sample records from the target table
      const sampleSize = Math.min(100, (config.sampleSize as number) || 50);

      let passCount = 0;
      let totalChecked = 0;

      // Map targetModel to actual Prisma table name (camelCase → PascalCase)
      const tableName = targetModel;

      try {
        // Use raw query to sample from the target table
        const rows = (await prisma.$queryRawUnsafe(
          `SELECT * FROM "${tableName}" ORDER BY rowid DESC LIMIT ?`,
          sampleSize,
        )) as Array<Record<string, unknown>>;

        totalChecked = rows.length;

        if (rows.length === 0) {
          // No data — mark as info/warning depending on severity
          passed = rule.severity === "info";
          details.sampleSize = 0;
          details.reason = "No records found in target table";
        } else {
          details.sampleSize = rows.length;

          switch (rule.ruleType) {
            case "not_null": {
              // Check that a specific field is not null
              for (const row of rows) {
                if (row[field] !== null && row[field] !== undefined) {
                  passCount++;
                }
              }
              break;
            }
            case "range": {
              // Check that a numeric field is within [min, max]
              const min = (config.min as number) ?? 0;
              const max = (config.max as number) ?? 100;
              for (const row of rows) {
                const val = Number(row[field]);
                if (!isNaN(val) && val >= min && val <= max) {
                  passCount++;
                }
              }
              expectedValue = 100;
              break;
            }
            case "uniqueness": {
              // Check that values in a field are unique
              const values = rows.map((r) => r[field]);
              const uniqueValues = new Set(values);
              passCount = uniqueValues.size;
              // For uniqueness, "passed" means high unique ratio
              break;
            }
            case "freshness": {
              // Check that records have a recent timestamp
              const freshnessHours = (config.freshnessHours as number) ?? 24;
              const cutoff = new Date(
                Date.now() - freshnessHours * 60 * 60 * 1000,
              );
              for (const row of rows) {
                const ts = row["createdAt"] || row["timestamp"];
                if (ts && new Date(ts as string) >= cutoff) {
                  passCount++;
                }
              }
              expectedValue = threshold;
              break;
            }
            case "completeness": {
              // Check that key fields are populated
              const fields = (config.fields as string[]) || [];
              for (const row of rows) {
                let rowComplete = true;
                for (const f of fields) {
                  if (
                    row[f] === null ||
                    row[f] === undefined ||
                    row[f] === ""
                  ) {
                    rowComplete = false;
                    break;
                  }
                }
                if (rowComplete) passCount++;
              }
              expectedValue = threshold;
              break;
            }
            default: {
              // custom rule — simulated result
              passCount = Math.floor(rows.length * (0.85 + Math.random() * 0.15));
              expectedValue = threshold;
            }
          }

          if (totalChecked > 0) {
            actualValue = Math.round((passCount / totalChecked) * 100);
            passed = actualValue >= expectedValue;
          }

          details.failedRecords = totalChecked - passCount;
          details.passRecords = passCount;
        }
      } catch (rawErr: unknown) {
        // Table might not exist or field not found — simulate
        const errMsg = rawErr instanceof Error ? rawErr.message : String(rawErr);
        console.log(
          `[Quality] Raw query error for rule "${rule.name}": ${errMsg} — simulating result`,
        );
        actualValue = Math.round(85 + Math.random() * 15);
        passed = actualValue >= expectedValue;
        details.reason = "Table/field not found — simulated result";
        details.error = errMsg;
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(
        `[Quality] Error evaluating rule "${rule.name}":`,
        errMsg,
      );
      passed = false;
      actualValue = 0;
      details.error = errMsg;
    }

    // Create quality result
    await prisma.dataQualityResult.create({
      data: {
        ruleId: rule.id,
        pipelineId: pipelineId || null,
        executionId: executionId || null,
        passed,
        actualValue,
        expectedValue,
        evaluatedAt: new Date(),
        details: JSON.stringify(details),
      },
    });

    // Update rule stats
    const newEvaluations = rule.totalEvaluations + 1;
    const newPasses = rule.totalPasses + (passed ? 1 : 0);
    const newFailures = rule.totalFailures + (passed ? 0 : 1);
    const newPassRate = Math.round((newPasses / newEvaluations) * 100) / 100;

    await prisma.dataQualityRule.update({
      where: { id: rule.id },
      data: {
        lastEvaluatedAt: new Date(),
        lastPassRate: newPassRate,
        totalEvaluations: newEvaluations,
        totalPasses: newPasses,
        totalFailures: newFailures,
      },
    });

    console.log(
      `[Quality] Rule "${rule.name}" → ${passed ? "PASS" : "FAIL"} (${actualValue}% actual vs ${expectedValue}% expected)`,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHEDULER LOOP
// ══════════════════════════════════════════════════════════════════════════════

async function schedulerTick() {
  try {
    const pipelines = await prisma.dataPipeline.findMany({
      where: {
        enabled: true,
        status: "active",
      },
    });

    pipelinesMonitored = pipelines.length;

    const now = new Date();
    const duePipelines = pipelines.filter((p) => {
      if (p.nextRun && new Date(p.nextRun) <= now) return true;
      return false;
    });

    if (duePipelines.length > 0) {
      console.log(
        `[Scheduler] ${duePipelines.length} pipeline(s) due at ${now.toISOString()}`,
      );
    }

    for (const pipeline of duePipelines) {
      // Don't overlap — skip if there's a recent running execution
      const recentRunning = await prisma.pipelineExecution.findFirst({
        where: {
          pipelineId: pipeline.id,
          status: "running",
          startedAt: { gte: new Date(Date.now() - 60_000) },
        },
      });
      if (recentRunning) {
        console.log(
          `[Scheduler] Skipping "${pipeline.name}" — already running (exec: ${recentRunning.id})`,
        );
        continue;
      }

      executePipeline(pipeline.id, "scheduled").catch((err) => {
        console.error(`[Scheduler] Error executing pipeline:`, err);
      });
    }
  } catch (err) {
    console.error("[Scheduler] Tick error:", err);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HTTP SERVER
// ══════════════════════════════════════════════════════════════════════════════

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // GET /health
    if (method === "GET" && path === "/health") {
      return jsonRes(200, {
        status: "ok",
        uptime: Math.round((Date.now() - STARTED_AT) / 1000),
        pipelinesMonitored,
      });
    }

    // POST /trigger
    if (method === "POST" && path === "/trigger") {
      try {
        const body = await parseBody(req);
        const pipelineId = body.pipelineId as string;
        if (!pipelineId) {
          return jsonRes(400, { error: "pipelineId is required" });
        }

        const pipeline = await prisma.dataPipeline.findUnique({
          where: { id: pipelineId },
        });
        if (!pipeline) {
          return jsonRes(404, { error: "Pipeline not found" });
        }

        // Trigger async
        executePipeline(pipelineId, "manual").catch((err) => {
          console.error("[Trigger] Error:", err);
        });

        return jsonRes(202, {
          message: `Pipeline "${pipeline.name}" triggered`,
          pipelineId,
        });
      } catch (err) {
        return jsonRes(500, {
          error: "Failed to trigger pipeline",
          details: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // POST /evaluate-quality
    if (method === "POST" && path === "/evaluate-quality") {
      try {
        const body = await parseBody(req);
        const ruleId = body.ruleId as string | undefined;
        const pipelineId = body.pipelineId as string | undefined;

        let pipeline: { id: string; target: string } | null = null;

        if (pipelineId) {
          pipeline = await prisma.dataPipeline.findUnique({
            where: { id: pipelineId },
            select: { id: true, target: true },
          });
          if (!pipeline) {
            return jsonRes(404, { error: "Pipeline not found" });
          }
        }

        if (ruleId) {
          const rule = await prisma.dataQualityRule.findUnique({
            where: { id: ruleId },
          });
          if (!rule) {
            return jsonRes(404, { error: "Quality rule not found" });
          }
          // Evaluate single rule
          await evaluateQuality(
            rule.targetModel,
            pipelineId || null,
            "manual-eval",
          );
          return jsonRes(200, {
            message: `Quality rule "${rule.name}" evaluated`,
            ruleId,
          });
        }

        if (pipeline) {
          // Evaluate all rules matching this pipeline's target
          await evaluateQuality(pipeline.target, pipeline.id, "manual-eval");
          return jsonRes(200, {
            message: `Quality evaluation triggered for pipeline target "${pipeline.target}"`,
            pipelineId,
          });
        }

        // No specific target — evaluate all enabled rules against their targets
        const allRules = await prisma.dataQualityRule.findMany({
          where: { isEnabled: true },
        });
        const targets = [...new Set(allRules.map((r) => r.targetModel))];
        for (const target of targets) {
          await evaluateQuality(target, null, "manual-eval");
        }

        return jsonRes(200, {
          message: `Quality evaluation triggered for ${targets.length} target model(s)`,
          targets,
        });
      } catch (err) {
        return jsonRes(500, {
          error: "Failed to evaluate quality",
          details: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // 404
    return jsonRes(404, {
      error: "Not found",
      availableEndpoints: ["GET /health", "POST /trigger", "POST /evaluate-quality"],
    });
  },
});

console.log(`
╔══════════════════════════════════════════════════════════════╗
║  NetOptima DZ — ETL Mini-Service                            ║
║  Port: ${PORT}                                               ║
║  Endpoints:                                                  ║
║    GET  /health            → Service health & uptime         ║
║    POST /trigger           → Trigger pipeline execution      ║
║    POST /evaluate-quality  → Run data quality evaluation     ║
║  Scheduler: Every 30 seconds                                 ║
╚══════════════════════════════════════════════════════════════╝
`);

// ══════════════════════════════════════════════════════════════════════════════
// START SCHEDULER
// ══════════════════════════════════════════════════════════════════════════════

// Run initial tick after 2 seconds
setTimeout(schedulerTick, 2_000);
// Then every 30 seconds
setInterval(schedulerTick, 30_000);

// ══════════════════════════════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN
// ══════════════════════════════════════════════════════════════════════════════

const shutdown = async (signal: string) => {
  console.log(`\n[ETL] ${signal} — Shutting down...`);
  await prisma.$disconnect();
  server.stop();
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
