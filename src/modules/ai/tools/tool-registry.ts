import { Intent } from "../classifier/intent.types";
import { AgentTool } from "./interfaces";
import { BusinessTool } from "./implementations/business.tool";
import { LogsTool } from "./implementations/logs.tool";
import { MetricsTool } from "./implementations/metrics.tool";
import { TraceTool } from "./implementations/trace.tool";
import { IssueTool } from "./implementations/issue.tool";
import { GeneralKnowledgeTool } from "./implementations/general-knowledge.tool";
import { DocumentationTool } from "./implementations/documentation.tool";
import { SemanticSearchTool } from "./implementations/semantic-search.tool";

export class ToolRegistry {
  private tools: Map<string, AgentTool> = new Map();

  constructor() {
    this.registerDefaultTools();
  }

  register(tool: AgentTool) {
    this.tools.set(tool.name, tool);
  }

  getToolsForIntents(intents: Intent[]): AgentTool[] {
    const selectedTools: AgentTool[] = [];
    for (const tool of this.tools.values()) {
      if (tool.intents.some(i => intents.includes(i))) {
        // Prevent duplicates if a tool handles multiple requested intents
        if (!selectedTools.includes(tool)) {
          selectedTools.push(tool);
        }
      }
    }
    return selectedTools;
  }

  private registerDefaultTools() {
    this.register(new BusinessTool());
    this.register(new LogsTool());
    this.register(new MetricsTool());
    this.register(new TraceTool());
    this.register(new IssueTool());
    this.register(new GeneralKnowledgeTool());
    this.register(new DocumentationTool());
    this.register(new SemanticSearchTool());
  }
}

export const toolRegistry = new ToolRegistry();
