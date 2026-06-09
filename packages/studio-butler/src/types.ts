import type { AuthUser } from '@acs/core';
import type { TopicOutline } from '@acs/content-center';

export type ButlerProposalKind =
  | 'apply_outline'
  | 'create_articles'
  | 'generate_contents';

export type ButlerProposalStatus = 'pending' | 'confirmed' | 'rejected';

export type ButlerProposal = {
  id: string;
  kind: ButlerProposalKind;
  status: ButlerProposalStatus;
  topicId?: string;
  payload: Record<string, unknown>;
};

export type ButlerActionType =
  | 'view_topic'
  | 'view_content'
  | 'ai_generate'
  | 'create_from_outline'
  | 'confirm_proposal'
  | 'reject_proposal';

export type ButlerAction = {
  type: ButlerActionType;
  label: string;
  href?: string;
  payload?: Record<string, unknown>;
};

export type ButlerToolId =
  | 'topic.planOutline'
  | 'content.createFromOutline'
  | 'content.generate'
  | 'series.status'
  | 'knowledge.sync'
  | 'chat.reply';

export type ButlerContext = {
  user: AuthUser;
  sessionId: string;
  topicId?: string | null;
  message: string;
  onDelta?: (text: string) => void;
};

export type ButlerStreamEvent =
  | {
      type: 'user_message';
      data: { id: string; content: string; createdAt: Date };
    }
  | { type: 'delta'; text: string }
  | {
      type: 'done';
      data: {
        assistantMessage: {
          id: string;
          content: string;
          metadata?: unknown;
          createdAt: Date;
        };
        actions?: ButlerAction[];
        data?: Record<string, unknown>;
      };
    }
  | { type: 'error'; message: string };

export type RoutedIntent = {
  toolId: ButlerToolId;
  params: Record<string, unknown>;
};

export type ToolResult = {
  reply: string;
  actions?: ButlerAction[];
  data?: Record<string, unknown>;
  proposal?: ButlerProposal;
};

export type ButlerSessionWithMessages = {
  id: string;
  userId: string;
  topicId: string | null;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  topic?: { id: string; title: string; outline?: TopicOutline | null } | null;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    metadata?: unknown;
    createdAt: Date;
  }>;
};
