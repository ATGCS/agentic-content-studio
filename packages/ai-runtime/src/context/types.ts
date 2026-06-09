import type { AgentType, Platform } from '@acs/db';
import type { RuntimeVariables } from '../runtime/types.js';

export type ContextBuildInput = {
  contentId: string;
  versionId?: string;
  accountId?: string;
  platform?: Platform | string;
  count?: number;
  imageRole?: string;
  agentType?: AgentType | string;
};

export type ContextProvider = {
  id: string;
  build(input: ContextBuildInput): Promise<RuntimeVariables>;
};
