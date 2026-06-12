-- CreateTable
CREATE TABLE "topic_knowledge_bases" (
    "topicId" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("topicId", "knowledgeBaseId"),
    CONSTRAINT "topic_knowledge_bases_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "topic_knowledge_bases_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "ima_knowledge_bases" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "topic_knowledge_bases_knowledgeBaseId_idx" ON "topic_knowledge_bases"("knowledgeBaseId");
