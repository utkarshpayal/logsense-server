export enum ToolType {
  SQL = "SQL",
  RAG = "RAG",
  METRICS = "METRICS",
  TRACES = "TRACES",
  REDIS = "REDIS",
  DATABASE = "DATABASE",
  INCIDENTS = "INCIDENTS",
  KNOWLEDGE = "KNOWLEDGE",
  GENERAL = "GENERAL",
}

export interface ExecutionStep {
  tool: ToolType;
  reason: string;
}

export interface ExecutionPlan {
  question: string;
  steps: ExecutionStep[];
}

export class AIPlanner {
  createPlan(question: string): ExecutionPlan {
    const q = question.toLowerCase();

    const steps: ExecutionStep[] = [];

    /**
     * -----------------------------------------
     * SQL
     * -----------------------------------------
     */
    if (
      this.containsAny(q, [
        "error",
        "logs",
        "requests",
        "request",
        "latency",
        "endpoint",
        "api",
        "service",
        "status",
        "user",
        "login",
      ])
    ) {
      steps.push({
        tool: ToolType.SQL,
        reason: "Current log analysis",
      });
    }

    /**
     * -----------------------------------------
     * Metrics
     * -----------------------------------------
     */
    if (
      this.containsAny(q, [
        "cpu",
        "memory",
        "heap",
        "runtime",
        "performance",
        "slow",
        "throughput",
        "rps",
        "p95",
        "p99",
      ])
    ) {
      steps.push({
        tool: ToolType.METRICS,
        reason: "Runtime metrics required",
      });
    }

    /**
     * -----------------------------------------
     * Trace
     * -----------------------------------------
     */
    if (
      this.containsAny(q, [
        "trace",
        "request flow",
        "span",
      ])
    ) {
      steps.push({
        tool: ToolType.TRACES,
        reason: "Trace analysis",
      });
    }

    /**
     * -----------------------------------------
     * Database
     * -----------------------------------------
     */
    if (
      this.containsAny(q, [
        "database",
        "postgres",
        "query",
        "sql",
      ])
    ) {
      steps.push({
        tool: ToolType.DATABASE,
        reason: "Database analysis",
      });
    }

    /**
     * -----------------------------------------
     * Redis
     * -----------------------------------------
     */
    if (
      this.containsAny(q, [
        "redis",
        "cache",
      ])
    ) {
      steps.push({
        tool: ToolType.REDIS,
        reason: "Redis analysis",
      });
    }

    /**
     * -----------------------------------------
     * Similar Incident
     * -----------------------------------------
     */
    if (
      this.containsAny(q, [
        "before",
        "previous",
        "similar",
        "again",
        "historical",
      ])
    ) {
      steps.push({
        tool: ToolType.INCIDENTS,
        reason: "Need similar incidents",
      });

      steps.push({
        tool: ToolType.RAG,
        reason: "Semantic similarity search",
      });
    }

    /**
     * -----------------------------------------
     * Documentation
     * -----------------------------------------
     */
    if (
      this.containsAny(q, [
        "how",
        "documentation",
        "guide",
        "explain",
        "what is",
      ])
    ) {
      steps.push({
        tool: ToolType.KNOWLEDGE,
        reason: "Knowledge search",
      });
    }

    /**
     * -----------------------------------------
     * General
     * -----------------------------------------
     */
    if (!steps.length) {
      steps.push({
        tool: ToolType.GENERAL,
        reason: "General LLM response",
      });
    }

    return {
      question,
      steps,
    };
  }

  private containsAny(
    text: string,
    keywords: string[],
  ): boolean {
    return keywords.some((keyword) =>
      text.includes(keyword),
    );
  }
}