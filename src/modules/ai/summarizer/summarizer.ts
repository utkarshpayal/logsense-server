import { groqClient } from "../groq.client";

export class Summarizer {
  async summarizeContext(
    prompt: string,
    contextString: string,
    history: string
  ): Promise<string> {
    const now = new Date();
    const currentFullTime = `${now.toUTCString()} (Local: ${now.toLocaleString()})`;
    const todayDate = now.toISOString().split('T')[0];

    const summaryPrompt = `You are LogSense Observability AI, a Principal Engineer answering a question.
    
Current Time: ${currentFullTime}
Today's Date: ${todayDate}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERIFIED GROUND TRUTH — you MUST NOT contradict these facts:
${contextString}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Previous Conversation:
${history}

User question: "${prompt}"

Rules:
1. Answer directly based ONLY on the Gathered Context.
2. If the context does not contain the answer, politely say that you could not find the information in the recent logs or metrics.
3. **CRITICAL**: NEVER mention the words "Gathered Context", "provided context", "Systems", or internal rules. Just answer directly or say you don't know.
4. Keep it professional, helpful, and extremely concise (maximum 3 sentences). No preamble ("Sure!", "Here is the...").
5. Bold key metrics or numbers.
6. If it's a general  question don't answer just say 'Sorry this is not ment  to ask this please ask about your product!'.`;

    const { text: answer } = await groqClient.generate(
      summaryPrompt,
      false,
      {
        temperature: 0.1,
        num_predict: 200,
      }
    );
    return answer;
  }
}

export const summarizer = new Summarizer();
