import { logger } from "../../config/logger";

export interface NotificationMetadata {
  totalLogs: number;
  levelBreakdown: Record<string, number>;
  services: string[];
  environments: string[];
}

export class NotificationService {
  async sendToDiscord(
    webhookUrl: string,
    content: string,
    projectName: string,
    metadata?: NotificationMetadata
  ) {
    try {
      // Discord embed description limit is 4096 characters
      let description = content;
      if (description.length > 4000) {
        description = description.slice(0, 3997) + "...";
      }

      const fields: any[] = [];
      if (metadata) {
        fields.push(
          {
            name: "📈 Total Logs",
            value: `\`${metadata.totalLogs}\``,
            inline: true,
          },
          {
            name: "⚙️ Services",
            value: `\`${metadata.services.join(", ") || "N/A"}\``,
            inline: true,
          },
          {
            name: "🛡️ Environment",
            value: `\`${metadata.environments.join(", ") || "N/A"}\``,
            inline: true,
          },
          {
            name: "📊 Severity Breakdown",
            value: `🟢 INFO: \`${metadata.levelBreakdown.INFO || 0}\`\n🟡 WARN: \`${metadata.levelBreakdown.WARN || 0}\`\n🔴 ERROR: \`${metadata.levelBreakdown.ERROR || 0}\`\n🔵 DEBUG: \`${metadata.levelBreakdown.DEBUG || 0}\``,
            inline: false,
          }
        );
      }

      const payload = {
        username: "LogSense AI Agent",
        avatar_url: "https://cdn-icons-png.flaticon.com/512/10817/10817417.png ",
        embeds: [
          {
            title: `📊 Daily AI Observability Report: ${projectName}`,
            description: description,
            color: 8140269, // Brand Violet #7c3aed
            fields: fields.length > 0 ? fields : undefined,
            timestamp: new Date().toISOString(),
            footer: {
              text: "LogSense Observability Engine",
            },
          },
        ],
      };

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }

      logger.info(`✅ Successfully sent Discord notification for project ${projectName}`);
    } catch (e: any) {
      logger.error(`❌ Failed to send Discord notification for project ${projectName}:`, e.message);
    }
  }


  async sendDailySummary(
    projectName: string,
    summary: string,
    urls: { discordUrl?: string | null },
    metadata?: NotificationMetadata
  ) {
    const promises: Promise<void>[] = [];

    if (urls.discordUrl) {
      promises.push(this.sendToDiscord(urls.discordUrl, summary, projectName, metadata));
    }

    // Also fallback to global webhooks from .env if project-specific webhooks are not set
    const globalDiscord = process.env.DISCORD_WEBHOOK_URL;

    if (!urls.discordUrl && globalDiscord) {
      promises.push(this.sendToDiscord(globalDiscord, summary, projectName, metadata));
    }

    await Promise.all(promises);
  }
}

export const notificationService = new NotificationService();
