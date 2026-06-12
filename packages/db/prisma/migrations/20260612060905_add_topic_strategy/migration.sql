-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OPERATOR',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "platform_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountType" TEXT,
    "authStatus" TEXT NOT NULL DEFAULT 'pending',
    "ownerId" TEXT NOT NULL,
    "externalAccountId" TEXT,
    "avatarUrl" TEXT,
    "scopes" JSONB,
    "authMode" TEXT,
    "lastSyncAt" DATETIME,
    "lastError" TEXT,
    "boundAt" DATETIME,
    "revokedAt" DATETIME,
    "rawData" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "platform_accounts_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "social_oauth_states" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "state" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "accountId" TEXT,
    "redirectAfterBind" TEXT,
    "scopes" JSONB,
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "social_oauth_states_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "social_oauth_states_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "platform_accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "social_account_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" DATETIME,
    "refreshExpiresAt" DATETIME,
    "scopes" JSONB,
    "rawData" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "social_account_tokens_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "platform_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "social_content_works" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platformWorkId" TEXT NOT NULL,
    "workType" TEXT,
    "coverUrl" TEXT,
    "duration" INTEGER,
    "status" TEXT,
    "contentVersionId" TEXT,
    "title" TEXT,
    "url" TEXT,
    "publishedAt" DATETIME,
    "rawData" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "social_content_works_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "platform_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "social_content_works_contentVersionId_fkey" FOREIGN KEY ("contentVersionId") REFERENCES "content_versions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "social_metric_snapshots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "workId" TEXT,
    "platform" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "collectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawData" JSONB,
    CONSTRAINT "social_metric_snapshots_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "platform_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "social_metric_snapshots_workId_fkey" FOREIGN KEY ("workId") REFERENCES "social_content_works" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "account_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "positioning" TEXT,
    "targetAudience" JSONB,
    "contentStyle" TEXT,
    "titlePreference" TEXT,
    "coverPreference" TEXT,
    "tone" TEXT,
    "forbiddenWords" JSONB,
    "contentBoundary" TEXT,
    "publishStrategy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "account_profiles_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "platform_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "topics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "outline" JSONB,
    "strategy" JSONB,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "targetPlatforms" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "topics_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "butler_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "topicId" TEXT,
    "title" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "butler_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "butler_sessions_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "butler_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "butler_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "butler_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "contents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topicId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "body" TEXT,
    "coverText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "contents_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "contents_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "content_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "accountId" TEXT,
    "title" TEXT,
    "body" TEXT,
    "coverText" TEXT,
    "tags" JSONB,
    "formatConfig" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "content_versions_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "contents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "content_versions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "platform_accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ATTACHMENT',
    "name" TEXT,
    "url" TEXT,
    "localPath" TEXT,
    "source" TEXT,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "materials_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "contents" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "prompts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'v1',
    "template" TEXT NOT NULL,
    "variables" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "promptId" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'deepseek-chat',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "agents_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "prompts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "agent_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "versionId" TEXT,
    "input" JSONB,
    "output" JSONB,
    "model" TEXT,
    "promptVersion" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    CONSTRAINT "agent_runs_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "agent_runs_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "contents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "agent_runs_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "content_versions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "content_revisions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentId" TEXT NOT NULL,
    "versionId" TEXT,
    "scope" TEXT NOT NULL,
    "platform" TEXT,
    "trigger" TEXT NOT NULL,
    "agentType" TEXT,
    "agentRunId" TEXT,
    "label" TEXT,
    "snapshot" JSONB NOT NULL,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "content_revisions_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "contents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "content_revisions_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "content_versions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "content_revisions_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "agent_runs" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "content_revisions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ima_knowledge_bases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "agentType" TEXT,
    "source" TEXT NOT NULL DEFAULT 'ima',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "rawData" JSONB,
    "syncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ima_knowledge_documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "knowledgeBaseId" TEXT NOT NULL,
    "externalMediaId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT,
    "sourceUrl" TEXT,
    "source" TEXT NOT NULL DEFAULT 'ima',
    "rawData" JSONB,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ima_knowledge_documents_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "ima_knowledge_bases" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ima_search_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentId" TEXT NOT NULL,
    "knowledgeBaseId" TEXT,
    "query" TEXT NOT NULL,
    "resultSummary" TEXT,
    "rawResult" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ima_search_logs_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "contents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ima_search_logs_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "ima_knowledge_bases" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "review_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentId" TEXT NOT NULL,
    "versionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewerId" TEXT,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    CONSTRAINT "review_tasks_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "contents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "review_tasks_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "content_versions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "review_tasks_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "publishing_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledAt" DATETIME,
    "publishedAt" DATETIME,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "publishing_tasks_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "contents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "publishing_tasks_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "content_versions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "publishing_tasks_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "platform_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "publish_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "externalPostId" TEXT,
    "externalUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rawResult" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "publish_records_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "publishing_tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "analytics_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publishRecordId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "versionId" TEXT,
    "platform" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "collects" INTEGER NOT NULL DEFAULT 0,
    "followersDelta" INTEGER NOT NULL DEFAULT 0,
    "rawData" JSONB,
    "collectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "analytics_data_publishRecordId_fkey" FOREIGN KEY ("publishRecordId") REFERENCES "publish_records" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "analytics_data_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "contents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "analytics_data_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "content_versions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "analytics_data_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "platform_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "analytics_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL DEFAULT 'content',
    "summary" TEXT,
    "insights" JSONB,
    "suggestions" JSONB,
    "createdByAgent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "analytics_reports_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "contents" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "system_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "platform_accounts_platform_authStatus_idx" ON "platform_accounts"("platform", "authStatus");

-- CreateIndex
CREATE INDEX "platform_accounts_ownerId_idx" ON "platform_accounts"("ownerId");

-- CreateIndex
CREATE INDEX "platform_accounts_platform_externalAccountId_idx" ON "platform_accounts"("platform", "externalAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "social_oauth_states_state_key" ON "social_oauth_states"("state");

-- CreateIndex
CREATE INDEX "social_oauth_states_ownerId_platform_createdAt_idx" ON "social_oauth_states"("ownerId", "platform", "createdAt");

-- CreateIndex
CREATE INDEX "social_oauth_states_accountId_idx" ON "social_oauth_states"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "social_account_tokens_accountId_key" ON "social_account_tokens"("accountId");

-- CreateIndex
CREATE INDEX "social_content_works_accountId_publishedAt_idx" ON "social_content_works"("accountId", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "social_content_works_platform_platformWorkId_key" ON "social_content_works"("platform", "platformWorkId");

-- CreateIndex
CREATE INDEX "social_metric_snapshots_accountId_collectedAt_idx" ON "social_metric_snapshots"("accountId", "collectedAt");

-- CreateIndex
CREATE INDEX "social_metric_snapshots_workId_collectedAt_idx" ON "social_metric_snapshots"("workId", "collectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "account_profiles_accountId_key" ON "account_profiles"("accountId");

-- CreateIndex
CREATE INDEX "topics_ownerId_status_createdAt_idx" ON "topics"("ownerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "butler_sessions_userId_updatedAt_idx" ON "butler_sessions"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "butler_sessions_topicId_idx" ON "butler_sessions"("topicId");

-- CreateIndex
CREATE INDEX "butler_messages_sessionId_createdAt_idx" ON "butler_messages"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "contents_topicId_status_createdAt_idx" ON "contents"("topicId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "contents_createdBy_idx" ON "contents"("createdBy");

-- CreateIndex
CREATE INDEX "content_versions_contentId_platform_idx" ON "content_versions"("contentId", "platform");

-- CreateIndex
CREATE INDEX "content_versions_accountId_status_idx" ON "content_versions"("accountId", "status");

-- CreateIndex
CREATE INDEX "materials_contentId_type_idx" ON "materials"("contentId", "type");

-- CreateIndex
CREATE INDEX "materials_type_role_idx" ON "materials"("type", "role");

-- CreateIndex
CREATE INDEX "prompts_agentType_enabled_idx" ON "prompts"("agentType", "enabled");

-- CreateIndex
CREATE INDEX "agents_type_enabled_idx" ON "agents"("type", "enabled");

-- CreateIndex
CREATE INDEX "agent_runs_contentId_status_startedAt_idx" ON "agent_runs"("contentId", "status", "startedAt");

-- CreateIndex
CREATE INDEX "agent_runs_agentId_startedAt_idx" ON "agent_runs"("agentId", "startedAt");

-- CreateIndex
CREATE INDEX "content_revisions_contentId_createdAt_idx" ON "content_revisions"("contentId", "createdAt");

-- CreateIndex
CREATE INDEX "content_revisions_versionId_createdAt_idx" ON "content_revisions"("versionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ima_knowledge_bases_externalId_key" ON "ima_knowledge_bases"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ima_knowledge_bases_name_key" ON "ima_knowledge_bases"("name");

-- CreateIndex
CREATE INDEX "ima_knowledge_bases_source_enabled_idx" ON "ima_knowledge_bases"("source", "enabled");

-- CreateIndex
CREATE INDEX "ima_knowledge_documents_knowledgeBaseId_syncedAt_idx" ON "ima_knowledge_documents"("knowledgeBaseId", "syncedAt");

-- CreateIndex
CREATE INDEX "ima_knowledge_documents_knowledgeBaseId_source_idx" ON "ima_knowledge_documents"("knowledgeBaseId", "source");

-- CreateIndex
CREATE UNIQUE INDEX "ima_knowledge_documents_knowledgeBaseId_externalMediaId_key" ON "ima_knowledge_documents"("knowledgeBaseId", "externalMediaId");

-- CreateIndex
CREATE INDEX "ima_search_logs_contentId_createdAt_idx" ON "ima_search_logs"("contentId", "createdAt");

-- CreateIndex
CREATE INDEX "ima_search_logs_knowledgeBaseId_idx" ON "ima_search_logs"("knowledgeBaseId");

-- CreateIndex
CREATE INDEX "review_tasks_status_createdAt_idx" ON "review_tasks"("status", "createdAt");

-- CreateIndex
CREATE INDEX "review_tasks_reviewerId_idx" ON "review_tasks"("reviewerId");

-- CreateIndex
CREATE INDEX "publishing_tasks_status_scheduledAt_idx" ON "publishing_tasks"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "publishing_tasks_versionId_idx" ON "publishing_tasks"("versionId");

-- CreateIndex
CREATE UNIQUE INDEX "publish_records_taskId_key" ON "publish_records"("taskId");

-- CreateIndex
CREATE INDEX "publish_records_accountId_createdAt_idx" ON "publish_records"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "analytics_data_publishRecordId_collectedAt_idx" ON "analytics_data"("publishRecordId", "collectedAt");

-- CreateIndex
CREATE INDEX "analytics_data_contentId_platform_idx" ON "analytics_data"("contentId", "platform");

-- CreateIndex
CREATE INDEX "analytics_reports_contentId_createdAt_idx" ON "analytics_reports"("contentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "system_configs_key_key" ON "system_configs"("key");
