import type { Agent, AgentType, Platform, Prompt } from '@acs/db';

export interface RunAgentInput {
  agentId?: string;
  agentType: AgentType;
  contentId: string;
  versionId?: string;
  accountId?: string;
  overrides?: { count?: number; platform?: Platform };
}

export type RuntimeVariables = Record<string, string>;

export type LoadedAgentPrompt = {
  agent: Agent;
  prompt: Prompt;
};

export type AgentSpec = {
  type: AgentType;
  contextProviders: string[];
  parser: string;
  applier: string;
};

export type ApplyOutputInput = {
  type: AgentType;
  contentId: string;
  versionId?: string;
  output: unknown;
};

export type OutputParser = (rawText: string) => unknown;
export type OutputApplier = (input: ApplyOutputInput) => Promise<void>;

export type AgentRunQuery = {
  contentId?: string;
  status?: string;
  agentType?: AgentType;
};
