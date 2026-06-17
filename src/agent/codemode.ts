import { createCodeTool } from "@cloudflare/codemode/ai";
import { createDeckAgentToolProvider } from "./tools";
import type { Tool } from "ai";
import type { CreateCodeToolOptions } from "@cloudflare/codemode/ai";
import type { DynamicWorkerExecutorOptions, Executor } from "@cloudflare/codemode";
import type { CreateDeckAgentToolProviderInput } from "./tools";

export interface CreateDeckCodeModeToolInput extends CreateDeckAgentToolProviderInput {
  loader?: WorkerLoader;
  executor?: Executor;
  timeout?: number;
  description?: string;
  createCodeTool?: (input: CreateCodeToolOptions) => Tool;
}

export async function createDeckCodeModeTool(input: CreateDeckCodeModeToolInput): Promise<Tool> {
  const executor = input.executor ?? (await createDynamicWorkerExecutor(input));
  const provider = createDeckAgentToolProvider(input);
  const makeCodeTool = input.createCodeTool ?? createCodeTool;

  return makeCodeTool({
    tools: [provider],
    executor,
    ...(input.description ? { description: input.description } : {}),
  });
}

async function createDynamicWorkerExecutor(input: CreateDeckCodeModeToolInput): Promise<Executor> {
  if (!input.loader) throw new Error("WorkerLoader binding is required to create a Code Mode executor");

  const { DynamicWorkerExecutor } = await import("@cloudflare/codemode");
  const options: DynamicWorkerExecutorOptions = {
    loader: input.loader,
    globalOutbound: null,
    ...(input.timeout ? { timeout: input.timeout } : {}),
  };
  return new DynamicWorkerExecutor(options);
}
