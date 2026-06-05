import type {
  ToolExecutionInput,
  ToolExecutionResult,
  ToolExecutor,
} from "@/server/integrations/types";

export class DemoPostgresExecutor implements ToolExecutor {
  async execute(input: ToolExecutionInput): Promise<ToolExecutionResult> {
    return {
      executor: "postgres_demo",
      message: "Simulated PostgreSQL write. No database connection or write occurred.",
      output: {
        action: input.action,
        environment: input.environment,
        queryId: `sim_pg_${input.actionRequestId.slice(0, 12)}`,
        rowsAffected: 0,
      },
      simulated: true,
      success: true,
    };
  }
}
