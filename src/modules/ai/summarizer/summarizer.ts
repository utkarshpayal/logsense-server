import { groqClient } from "../groq.client";

export class Summarizer {
  async summarizeContext(
    prompt: string,
    contextString: string,
    history: string
  ): Promise<string> {
    const summaryPrompt = `You are LogSense Observability AI, a Principal Engineer answering a question.
    
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERIFIED GROUND TRUTH — you MUST NOT contradict these facts:
${contextString}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Previous Conversation:
${history}

User question: "${prompt}"

Rules:
1. Answer directly based ONLY on the Gathered Context.
2. If the context does not contain the answer, say so. Do not invent data.
3. Keep it professional, helpful, and concise. No preamble ("Sure!", "Here is the...").
4. Bold key metrics or numbers.
5. If it's a general tech question (e.g., "What is Redis?"), answer using your knowledge base.`;

    const { text: answer } = await groqClient.generate(summaryPrompt, false);
    return answer;
  }
}

export const summarizer = new Summarizer();
