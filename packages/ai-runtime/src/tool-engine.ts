import { searchAndLog } from '@acs/ima-provider';

export { buildContext } from './context/context-engine.js';
export type { ContextBuildInput, ContextProvider } from './context/types.js';

export async function runImaSearch(contentId: string, query: string) {
  return searchAndLog(contentId, query);
}
