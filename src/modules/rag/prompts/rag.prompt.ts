import { RetrievalContext } from "../rag.types";

export interface RagPromptInput {
  question: string;
  retrieval: RetrievalContext;
}

export class RagPromptBuilder {
  build(input: RagPromptInput): string {
    const { question, retrieval } = input;

    const knowledge = retrieval.results
      .map((result, index) => {
        return `
=========================
Knowledge ${index + 1}
=========================
Similarity Score: ${result.score.toFixed(4)}

${result.chunk.content}
`;
      })
      .join("\n");

    return `
You are LogSense AI.

You are an AI Observability Engineer.

Answer ONLY using the retrieved context.

If the answer is not present in the retrieved context,
clearly state that you don't have enough information.

Do NOT hallucinate.

If multiple documents disagree,
mention the disagreement.

--------------------------
Retrieved Knowledge
--------------------------

${knowledge}

--------------------------
User Question
--------------------------

${question}

--------------------------
Instructions
--------------------------

1. Use only retrieved information.
2. Be concise.
3. Mention uncertainty if needed.
4. Never invent facts.
5. Prefer recent knowledge if timestamps exist.

Answer:
`;
  }
}