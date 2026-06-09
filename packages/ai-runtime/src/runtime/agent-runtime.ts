import {
  agentSpecRegistry,
  type AgentSpecRegistry,
} from '../agents/registry.js';
import {
  contextEngine,
  type ContextEngine,
} from '../context/context-engine.js';
import { getModelGateway } from '../model/factory.js';
import { resolveChatModel } from '../model/resolve-model.js';
import type { ModelGateway } from '../model/types.js';
import {
  outputApplierRegistry,
  type OutputApplierRegistry,
} from '../output/applier-registry.js';
import {
  outputParserRegistry,
  type OutputParserRegistry,
} from '../output/parser-registry.js';
import { buildMessages } from '../prompt/message-builder.js';
import {
  loadPromptByType,
  loadPromptForAgent,
} from '../prompt/prompt-loader.js';
import { renderPrompt } from '../prompt/prompt-renderer.js';
import { runImaSearch } from '../tool-engine.js';
import { isAgentDebugEnabled } from './debug.js';
import {
  agentRunRepository,
  type AgentRunRepository,
} from './run-repository.js';
import type { RunAgentInput } from './types.js';

function logAgentSection(title: string) {
  console.log(`\n========== [AgentRun] ${title} ==========`);
}

export class AgentRuntime {
  constructor(
    private readonly specs: AgentSpecRegistry = agentSpecRegistry,
    private readonly contexts: ContextEngine = contextEngine,
    private readonly parsers: OutputParserRegistry = outputParserRegistry,
    private readonly appliers: OutputApplierRegistry = outputApplierRegistry,
    private readonly runs: AgentRunRepository = agentRunRepository,
    private readonly gatewayFactory: () => ModelGateway = getModelGateway
  ) {}

  async run(input: RunAgentInput) {
    const { agent, prompt } = input.agentId
      ? await loadPromptForAgent(input.agentId)
      : await loadPromptByType(input.agentType);
    const spec = this.specs.get(agent.type);
    if (spec.contextProviders.includes('knowledge.ima.latest')) {
      if (isAgentDebugEnabled()) {
        logAgentSection('IMA 知识库检索');
      }
      try {
        const imaResult = await runImaSearch(input.contentId, {
          platform: input.overrides?.platform,
        });
        if (isAgentDebugEnabled()) {
          console.log('检索关键词:', imaResult.log.query);
          console.log('知识库 ID:', imaResult.knowledgeBaseId ?? '(未指定)');
          console.log('检索模式:', imaResult.mode);
          console.log('命中条数:', imaResult.items.length);
          console.log('imaSummary:', imaResult.log.resultSummary || '(空)');
          console.log(
            'IMA 原始响应:',
            JSON.stringify(imaResult.log.rawResult, null, 2)
          );
        }
      } catch (error) {
        if (isAgentDebugEnabled()) {
          console.warn(
            '检索失败:',
            error instanceof Error ? error.message : String(error)
          );
        }
      }
    }

    const variables = await this.contexts.build(
      {
        contentId: input.contentId,
        versionId: input.versionId,
        accountId: input.accountId,
        platform: input.overrides?.platform,
        count: input.overrides?.count,
        imageRole: input.overrides?.imageRole,
      },
      spec.contextProviders
    );

    const run = await this.runs.create({
      agentId: agent.id,
      contentId: input.contentId,
      versionId: input.versionId,
      runInput: input,
      model: agent.model,
      promptVersion: prompt.version,
    });

    try {
      const rendered = renderPrompt(prompt.template, variables);
      if (rendered.missingVariables.length > 0) {
        throw new Error(
          `missing prompt variables: ${rendered.missingVariables.join(', ')}`
        );
      }

      const gateway = this.gatewayFactory();
      const model = resolveChatModel(agent.model);
      const messages = buildMessages({
        userPrompt: rendered.text,
        agentType: agent.type,
        agentConfig: agent.config,
      });

      if (isAgentDebugEnabled()) {
        logAgentSection(`${agent.name} (${agent.type})`);
        console.log('模型:', model);
        console.log('上下文变量:', JSON.stringify(variables, null, 2));
        logAgentSection('完整提示词');
        console.log(rendered.text);
        logAgentSection('发送给模型的 Messages');
        console.log(JSON.stringify(messages, null, 2));
      }

      const { content: raw } = await gateway.chat({ model, messages });

      if (isAgentDebugEnabled()) {
        logAgentSection('模型原始输出');
        console.log(raw);
      }

      const output = this.parsers.get(spec.parser)(raw);

      if (isAgentDebugEnabled()) {
        logAgentSection('解析后的输出');
        console.log(JSON.stringify(output, null, 2));
      }

      await this.runs.markSuccess(run.id, output);
      await this.appliers.get(spec.applier)({
        type: agent.type,
        contentId: input.contentId,
        versionId: input.versionId,
        output,
        overrides: input.overrides,
      });

      return this.runs.findById(run.id);
    } catch (error) {
      await this.runs.markFailed(run.id, error);
      throw error;
    }
  }
}

export const agentRuntime = new AgentRuntime();

export function runAgent(input: RunAgentInput) {
  return agentRuntime.run(input);
}

export function runAgentByType(
  type: RunAgentInput['agentType'],
  input: Omit<RunAgentInput, 'agentType'>
) {
  return runAgent({ ...input, agentType: type });
}
