import { AiMessage } from "../types/agent.types";

export class ConversationMemory {
  // Simple in-memory storage for demonstration. 
  // In production, this should be backed by Redis or Postgres.
  // Keyed by projectId (or userId/sessionId)
  private memory: Map<string, AiMessage[]> = new Map();

  /**
   * Retrieves the recent conversation history for a project.
   */
  getHistory(projectId: string, limit: number = 10): AiMessage[] {
    const history = this.memory.get(projectId) || [];
    // Return the last N messages
    return history.slice(-limit);
  }

  /**
   * Adds a user message and an assistant response to the history.
   */
  addInteraction(projectId: string, userMessage: string, assistantResponse: string) {
    const history = this.memory.get(projectId) || [];
    
    history.push({ role: "user", content: userMessage });
    history.push({ role: "assistant", content: assistantResponse });

    // Keep history manageable (e.g., max 50 messages)
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }

    this.memory.set(projectId, history);
  }

  /**
   * Formats history for LLM consumption.
   */
  formatHistoryForPrompt(projectId: string): string {
    const history = this.getHistory(projectId);
    if (history.length === 0) return "No previous conversation.";

    return history.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join("\n");
  }
}

export const conversationMemory = new ConversationMemory();
