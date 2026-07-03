import { ToolResult } from "../tools/interfaces";

export class ContextBuilder {
  /**
   * Takes the outputs from all executed tools and merges them into a string
   * formatted for the Summarizer LLM to read easily.
   */
  build(toolResults: ToolResult[]): string {
    if (!toolResults || toolResults.length === 0) {
      return "No context available.";
    }

    let contextString = "## Gathered Context from Systems\n\n";

    for (const result of toolResults) {
      contextString += `### Source: ${result.toolName}\n`;
      if (result.success) {
        contextString += `Explanation: ${result.explanation}\n`;
        // Stringify data carefully to avoid blowing up the token limit
        const dataStr = JSON.stringify(result.data, null, 2);
        
        // Truncate if massive
        if (dataStr.length > 10000) {
          contextString += `Data:\n${dataStr.substring(0, 10000)}... (truncated)\n`;
        } else {
          contextString += `Data:\n${dataStr}\n`;
        }
      } else {
        contextString += `Error retrieving data: ${result.error}\n`;
      }
      contextString += "\n---\n\n";
    }

    return contextString;
  }
}

export const contextBuilder = new ContextBuilder();
