export interface AiMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ConversationContext {
  projectId: string;
  history: AiMessage[];
  metadata?: Record<string, any>;
}

export interface ToolExecutionResult {
  toolName: string;
  success: boolean;
  data: any;
  explanation?: string;
  error?: string;
}

export interface AiChatResult {
  success: boolean;
  answer?: string;
  data?: any[];
  errorType?: "CONFIG_ERROR" | "TOOL_ERROR" | "DB_ERROR" | "LLM_ERROR" | "PLANNING_ERROR";
  message?: string;
}
