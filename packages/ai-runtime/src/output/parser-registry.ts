import type { AgentType } from '@acs/db';
import type { OutputParser } from '../runtime/types.js';
import { outputParsers } from './parsers.js';

const parserByAgentType: Record<AgentType, keyof typeof outputParsers> = {
  TITLE: 'title',
  BODY: 'body',
  REWRITE: 'rewrite',
  REVIEW: 'review',
  SUMMARY: 'summary',
  TAG: 'tag',
  IMAGE: 'image',
  VIDEO_SCRIPT: 'videoScript',
  TOPIC: 'topic',
  COVER_COPY: 'coverCopy',
  COMPETITOR: 'competitor',
};

export class OutputParserRegistry {
  private readonly parsers = new Map<string, OutputParser>(Object.entries(outputParsers));

  get(id: string): OutputParser {
    const parser = this.parsers.get(id);
    if (!parser) throw new Error(`output parser not found: ${id}`);
    return parser;
  }

  getByAgentType(type: AgentType): OutputParser {
    return this.get(parserByAgentType[type]);
  }
}

export const outputParserRegistry = new OutputParserRegistry();

export function parseOutput(type: AgentType, rawText: string): unknown {
  return outputParserRegistry.getByAgentType(type)(rawText);
}
