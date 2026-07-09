import { ToolResult } from "../tools/interfaces";

function sanitizeMetadata(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    if (typeof obj === 'string' && obj.length > 80) {
      return obj.substring(0, 80) + '...';
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeMetadata);
  }

  const allowedKeys = new Set([
    'actor', 'user_id', 'userid', 'user', 'email',
    'error', 'err', 'message', 'exception', 'stack',
    'duration', 'latency', 'latency_ms',
    'action', 'event', 'type',
    'statuscode', 'status', 'method', 'url'
  ]);

  const sanitized: any = {};
  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Ignore security-related keys entirely
    if (
      lowerKey.includes('signature') ||
      lowerKey.includes('token') ||
      lowerKey.includes('cookie') ||
      lowerKey.includes('authorization') ||
      lowerKey.includes('password') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('key')
    ) {
      continue;
    }

    if (allowedKeys.has(lowerKey)) {
      sanitized[key] = sanitizeMetadata(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      // Recurse into nested objects to find allowed keys
      const nested = sanitizeMetadata(obj[key]);
      if (nested && Object.keys(nested).length > 0) {
        sanitized[key] = nested;
      }
    }
  }
  return sanitized;
}

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
        
        let formattedData = "";
        
        if (result.toolName === "LogsTool" || result.toolName === "SemanticSearch" || Array.isArray(result.data)) {
          const list = Array.isArray(result.data) ? result.data : [];
          // If it's a list of logs, format them concisely line-by-line
          if (list.length > 0 && typeof list[0] === 'object' && ('message' in list[0] || 'level' in list[0])) {
            const logsToFormat = list.slice(0, 5);
            formattedData = "Logs (Concise format):\n" + logsToFormat.map(item => {
              const cleanedItem = { ...item };
              if (cleanedItem.metadata) {
                cleanedItem.metadata = sanitizeMetadata(cleanedItem.metadata);
              }
              const time = cleanedItem.created_at ? new Date(cleanedItem.created_at).toISOString() : 'N/A';
              const level = (cleanedItem.level || 'info').toUpperCase();
              const service = cleanedItem.service || 'default';
              const msg = cleanedItem.message || '';
              const trace = cleanedItem.trace_id ? ` [Trace: ${cleanedItem.trace_id}]` : '';
              
              const isErrorOrWarn = level === 'ERROR' || level === 'WARN';
              const meta = isErrorOrWarn && cleanedItem.metadata && Object.keys(cleanedItem.metadata).length > 0
                ? ` | Metadata: ${JSON.stringify(cleanedItem.metadata)}`
                : '';
              return `- ${time} | ${level} | ${service} | ${msg}${trace}${meta}`;
            }).join("\n");
            
            if (list.length > 5) {
              formattedData += `\n... (truncated ${list.length - 5} older logs)`;
            }
          } else {
            // General array
            formattedData = JSON.stringify(list, null, 2);
          }
        } else {
          // General object
          const cleanedData = { ...result.data };
          if (cleanedData.metadata) {
            cleanedData.metadata = sanitizeMetadata(cleanedData.metadata);
          }
          formattedData = JSON.stringify(cleanedData, null, 2);
        }

        // Truncate if still massive
        if (formattedData.length > 10000) {
          contextString += `Data:\n${formattedData.substring(0, 10000)}... (truncated)\n`;
        } else {
          contextString += `Data:\n${formattedData}\n`;
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
