import { ExecutionPlan, ToolType } from "../planner/planner";

export interface Tool {
  readonly name: ToolType;

  execute(input: any): Promise<any>;
}

export class ToolRouter {
  private readonly tools = new Map<ToolType, Tool>();

  /**
   * Register Tool
   */
  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Execute Plan
   */
  async execute(
    plan: ExecutionPlan,
    input: any,
  ): Promise<Record<string, any>> {
    const results: Record<string, any> = {};

    for (const step of plan.steps) {
      const tool = this.tools.get(step.tool);

      if (!tool) {
        continue;
      }

      const result = await tool.execute(input);

      results[step.tool] = result;
    }

    return results;
  }

  /**
   * Execute Tools in Parallel
   */
  async executeParallel(
    plan: ExecutionPlan,
    input: any,
  ): Promise<Record<string, any>> {
    const output: Record<string, any> = {};

    const promises = plan.steps.map(async (step) => {
      const tool = this.tools.get(step.tool);

      if (!tool) return;

      output[step.tool] = await tool.execute(input);
    });

    await Promise.all(promises);

    return output;
  }
}