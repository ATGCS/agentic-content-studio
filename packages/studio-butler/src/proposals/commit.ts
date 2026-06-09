import { prisma } from '@acs/db';
import type { Platform } from '@acs/db';
import type { AuthUser } from '@acs/core';
import {
  createContent,
  updateTopicOutline,
  type TopicOutline,
} from '@acs/content-center';
import { orchestrateGenerate } from '@acs/studio-workflows';

export async function commitOutline(
  user: AuthUser,
  topicId: string,
  outline: TopicOutline
) {
  await updateTopicOutline(user, topicId, outline);
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    select: { title: true },
  });
  return {
    topicId,
    topicTitle: topic?.title,
    articleCount: outline.articles.length,
  };
}

export async function commitCreateArticles(
  user: AuthUser,
  topicId: string,
  articles: Array<{ title: string; summary: string }>
) {
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: { contents: { select: { title: true } } },
  });
  if (!topic) throw new Error('topic not found');

  const existingTitles = new Set(
    topic.contents.map((c) => c.title.trim().toLowerCase())
  );
  const created: Array<{ id: string; title: string }> = [];
  const skipped: string[] = [];

  for (const article of articles) {
    if (existingTitles.has(article.title.trim().toLowerCase())) {
      skipped.push(article.title);
      continue;
    }
    const content = await createContent(user, {
      title: article.title,
      summary: article.summary,
      topicId,
    });
    created.push({ id: content.id, title: content.title });
    existingTitles.add(article.title.trim().toLowerCase());
  }

  return { created, skipped, topicId, topicTitle: topic.title };
}

export async function commitGenerate(
  topicId: string | undefined,
  contentIds: string[]
) {
  const topic = topicId
    ? await prisma.topic.findUnique({
        where: { id: topicId },
        select: { targetPlatforms: true, title: true },
      })
    : null;

  const platforms = (topic?.targetPlatforms as Platform[] | null) ?? [
    'XIAOHONGSHU',
  ];
  const results: Array<{
    id: string;
    title: string;
    ok: boolean;
    error?: string;
  }> = [];

  for (const contentId of contentIds) {
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      select: { title: true },
    });
    if (!content) continue;
    try {
      await orchestrateGenerate(contentId, undefined, platforms);
      results.push({ id: contentId, title: content.title, ok: true });
    } catch (error) {
      results.push({
        id: contentId,
        title: content.title,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { results, topicId, topicTitle: topic?.title, platforms };
}
