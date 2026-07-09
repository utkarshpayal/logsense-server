import { RagContext } from "../../rag/rag.service";

export interface InvestigationContext {
  question: string;

  project: any;

  currentLogs: any[];

  metrics: any;

  traces: any[];

  incidents: any[];

  knowledge: RagContext | null;

  runtime: any;

  database: any[];

  redis: any[];

  externalApis: any[];

  recommendations: string[];
}

export class ContextBuilder {
  async build(
    context: InvestigationContext,
  ): Promise<string> {
    return `
==========================================================
QUESTION
==========================================================

${context.question}

==========================================================
PROJECT
==========================================================

${JSON.stringify(context.project, null, 2)}

==========================================================
CURRENT LOGS
==========================================================

${JSON.stringify(context.currentLogs, null, 2)}

==========================================================
TRACES
==========================================================

${JSON.stringify(context.traces, null, 2)}

==========================================================
METRICS
==========================================================

${JSON.stringify(context.metrics, null, 2)}

==========================================================
DATABASE
==========================================================

${JSON.stringify(context.database, null, 2)}

==========================================================
REDIS
==========================================================

${JSON.stringify(context.redis, null, 2)}

==========================================================
EXTERNAL APIS
==========================================================

${JSON.stringify(context.externalApis, null, 2)}

==========================================================
SIMILAR INCIDENTS
==========================================================

${context.knowledge?.context ?? ""}

==========================================================
RECOMMENDATIONS
==========================================================

${context.recommendations.join("\n")}
`;
  }
}