export interface ToolExecutionContext {
  question: string;

  projectId: string;

  userId?: string;

  organizationId?: string;

  traceId?: string;

  requestId?: string;

  metadata?: Record<string, any>;
}

export interface ToolExecutionResult {
  tool: string;

  success: boolean;

  data: any;

  metadata?: Record<string, any>;

  executionTime: number;
}

export interface ToolDefinition {
  name: string;

  description: string;

  version: string;

  enabled: boolean;
}

export interface AgentTool {
  /**
   * Tool Metadata
   */
  readonly definition: ToolDefinition;

  /**
   * Execute Tool
   */
  execute(
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult>;

  /**
   * Health Check
   */
  healthCheck(): Promise<boolean>;
}