import cron from "node-cron";
import { logger } from "../../config/logger";
import { projectRepository } from "../projects/project.repository";
import { logsRepository } from "../ai/repositories/logs.repository";
import { contextBuilder } from "../ai/agent/context-builder";
import { groqClient } from "../ai/groq.client";
import { notificationService } from "../notifications/notification.service";
import { authRepository } from "../auth/auth.repository";

export class LogsScheduler {
  /**
   * Generates an AI-powered summary report for a project's logs today
   * and sends it to configured Discord webhooks.
   */
  async generateAndSendDailyReport(projectId: string): Promise<string> {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const owner = await authRepository.findById(project.owner_id);

    const discordUrl = (project.discord_webhook_url || owner?.discord_webhook_url) ?? null;
    const globalDiscord = process.env.DISCORD_WEBHOOK_URL;

    // If no webhooks are configured, we skip processing to save AI costs/time
    if (!discordUrl  && !globalDiscord ) {
      logger.info(`[LogsScheduler] Skipping project "${project.name}" (no webhooks configured)`);
      return "No webhooks configured for this project.";
    }

    logger.info(`[LogsScheduler] Starting daily summary report generation for project: "${project.name}"`);

    // 1. Retrieve today's logs for this project (up to 200 logs to prevent overload)
    //TODO:  need to give filter like which type of logs we need to fetch
    const logs = await logsRepository.searchLogs(projectId, {
      timeRange: "today",
      limit: 200,
    });

    if (!logs || logs.length === 0) {
      const emptyMessage = "No logs were recorded today. The system is either idle or inactive.";

      await notificationService.sendDailySummary(project.name, emptyMessage, {
        discordUrl,
      });
      return emptyMessage;
    }

    // Calculate metadata statistics
    const totalLogs = logs.length;
    const levelBreakdown: Record<string, number> = { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, FATAL: 0 };
    const services = new Set<string>();
    const environments = new Set<string>();

    for (const log of logs) {
      const lvl = (log.level || "INFO").toUpperCase();
      levelBreakdown[lvl] = (levelBreakdown[lvl] || 0) + 1;
      if (log.service) services.add(log.service);
      if (log.environment) environments.add(log.environment);
    }

    // 2. Compress/Deduplicate logs for prompt size optimization
    //TODO:  need to improve this
    const logGroups = new Map<string, { count: number; firstSeen: Date; lastSeen: Date; level: string; message: string; service?: string; env?: string }>();
    for (const log of logs) {
      const key = `${log.level}:${log.message}:${log.service ?? ""}:${log.environment ?? ""}`;
      const existing = logGroups.get(key);
      const logDate = new Date(log.created_at);
      if (existing) {
        existing.count++;
        if (logDate < existing.firstSeen) existing.firstSeen = logDate;
        if (logDate > existing.lastSeen) existing.lastSeen = logDate;
      } else {
        logGroups.set(key, {
          count: 1,
          firstSeen: logDate,
          lastSeen: logDate,
          level: log.level,
          message: log.message,
          service: log.service,
          env: log.environment,
        });
      }
    }

    //TODO:  need to improve this
    const compressedLogs = Array.from(logGroups.values()).map((details) => {
      return {
        level: details.level,
        message: details.message,
        service: details.service,
        environment: details.env,
        occurrences: details.count,
        timeframe: `${details.firstSeen.toISOString()} to ${details.lastSeen.toISOString()}`,
      };
    });


    // 3. Build the context using our compact formatter
    const contextString = contextBuilder.build([
      {
        toolName: "LogsTool",
        success: true,
        data: compressedLogs,
        explanation: `Today's compressed logs (grouped by pattern and occurrences) for project: ${project.name}`,
      },
    ]);

    // 4. Request the AI to write a beautiful daily report summary
    const prompt = `You are LogSense Observability AI, a Principal Staff Engineer.
Generate a highly professional, structured, and polished Daily Observability & Business Report for the project "${project.name}" based ONLY on the logs provided below.

Today's Logs for Project: ${project.name}:
${contextString}

Requirements & Structure:
Use clear sections, clean Markdown formatting, and professional emoji indicators.

1. **Executive Summary (Business View)**:
   - Provide a 1-2 sentence high-level health overview of the system today.
   - Summarize key business events, user transactions, and system activity (e.g., user signups, auth events, locations, client IPs, major activities) along with their frequencies.

2. **Technical Performance & System Metrics (Tech View)**:
   - Present a clear log volume breakdown (Info, Warn, Error, Debug).
   - Detail average response latency, success rates, and performance patterns of critical endpoints.
   - Include resource utilization highlights if present in the logs (e.g., CPU, Memory, heap size, event loop delay).

3. **Anomalies, Exceptions & Warnings**:
   - Explicitly list repeating errors, warning signs, authentication failures, or trace paths of anomalous events.
   - If there are no errors/warnings, state: "✅ No anomalies or errors detected. System operating within baseline thresholds."

4. **Actionable Recommendations**:
   - Provide 1-2 short, technical recommendations to improve system reliability, code performance, or logging efficiency (e.g., fixing duplicate logging, optimizing query routes, or adjusting memory limits).

Keep the tone objective, analytical, and professional. Do not mention "provided context", "rules", or "system prompt" in your output.`;

    const { text: summary } = await groqClient.generate(prompt, false);

    // 5. Send to  Discord
    await notificationService.sendDailySummary(
      project.name,
      summary,
      {
        discordUrl,
      },
      {
        totalLogs,
        levelBreakdown,
        services: Array.from(services),
        environments: Array.from(environments),
      }
    );

    logger.info(`[LogsScheduler] Daily summary report sent successfully for project: "${project.name}"`);
    return summary;
  }

  /**
   * Starts the cron job scheduler to run daily at 23:59 (11:59 PM)
   */

  startDailyReportScheduler() {
    // Run daily at 11:59 PM (23:59)
    cron.schedule("59 23 * * *", async () => {
      logger.info("[LogsScheduler] Running daily scheduled logs reporting job...");
      try {
        const activeProjects = await projectRepository.findAllActiveProjects();
        for (const project of activeProjects) {
          try {
            await this.generateAndSendDailyReport(project.id);
          } catch (e: any) {
            logger.error(`[LogsScheduler] Failed daily report for project ${project.id}:`, e.message);
          }
        }
      } catch (e: any) {
        logger.error("[LogsScheduler] Failed to fetch active projects for scheduler:", e.message);
      }
    });

    logger.info("[LogsScheduler] Daily scheduled logs reporting job initialized (cron: 59 23 * * *)");
  }
}

export const logsScheduler = new LogsScheduler();
