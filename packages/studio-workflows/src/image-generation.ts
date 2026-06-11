import { prisma, type MaterialRole, type Platform } from '@acs/db';
import {
  editImage,
  generateImage,
  getImageMaterialSource,
  resolveImageSize,
  type ImageRole,
} from '@acs/image-provider';
import { runAgentByType } from '@acs/ai-runtime';
import { enrichUserImagePrompt } from '@acs/studio-agents';

export type ImageGenerationOptions = {
  role?: ImageRole;
  platform?: Platform;
  versionId?: string;
  accountId?: string;
  /** 直接指定提示词，跳过 IMAGE Agent */
  prompt?: string;
  /** 正文插图 slot 标识 */
  slotId?: string;
  slotAlt?: string;
  /** 编辑已有素材 */
  sourceMaterialId?: string;
  editInstruction?: string;
};

async function saveMaterial(
  contentId: string,
  data: {
    role: MaterialRole;
    url: string;
    name: string;
    prompt: string;
    model: string;
    sourceMaterialId?: string;
    source?: string;
    versionId?: string;
    slotId?: string;
    platform?: Platform;
  }
) {
  return prisma.material.create({
    data: {
      contentId,
      type: 'IMAGE',
      role: data.role,
      name: data.name,
      url: data.url,
      source: data.source ?? getImageMaterialSource(),
      meta: {
        prompt: data.prompt,
        model: data.model,
        sourceMaterialId: data.sourceMaterialId,
        versionId: data.versionId,
        slotId: data.slotId,
        platform: data.platform,
      },
    },
  });
}

/** 生成或编辑图片，并写入素材库 */
export async function orchestrateImageGeneration(
  contentId: string,
  options: ImageGenerationOptions = {}
) {
  const role = (options.role ?? 'COVER') as ImageRole;
  const platform = options.platform;

  if (options.sourceMaterialId && options.editInstruction) {
    const source = await prisma.material.findFirst({
      where: { id: options.sourceMaterialId, contentId },
    });
    if (!source?.url) {
      throw new Error('源图片不存在或缺少 URL');
    }

    const size = resolveImageSize(platform, role);
    const result = await editImage(options.editInstruction, source.url, size);

    const material = await saveMaterial(contentId, {
      role,
      url: result.url,
      name: role === 'COVER' ? 'AI 封面（编辑）' : 'AI 配图（编辑）',
      prompt: options.editInstruction,
      model: result.model,
      sourceMaterialId: source.id,
      versionId: options.versionId,
      platform,
    });

    return { material, image: result, mode: 'edit' as const };
  }

  const userPrompt = options.prompt?.trim();
  if (userPrompt) {
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      include: {
        topic: true,
        versions: options.versionId
          ? { where: { id: options.versionId }, take: 1 }
          : { take: 0 },
      },
    });
    const version = content?.versions[0];
    const seedreamPrompt = enrichUserImagePrompt(userPrompt, {
      topicTitle: content?.topic?.title ?? content?.title,
      title: version?.title ?? content?.title,
      summary: content?.summary ?? undefined,
      coverText: version?.coverText ?? undefined,
      platform,
      imageRole: role,
    });

    const size = resolveImageSize(platform, role);
    const result = await generateImage({ prompt: seedreamPrompt, size });

    const material = await saveMaterial(contentId, {
      role,
      url: result.url,
      name:
        role === 'COVER'
          ? 'AI 封面'
          : options.slotId
            ? `AI 配图 ${options.slotId}`
            : 'AI 配图',
      prompt: seedreamPrompt,
      model: result.model,
      versionId: options.versionId,
      slotId: options.slotId,
      platform,
    });

    return { material, image: result, mode: 'generate' as const };
  }

  {
    const agentRun = await runAgentByType('IMAGE', {
      contentId,
      versionId: options.versionId,
      accountId: options.accountId,
      overrides: {
        platform,
        imageRole: role,
      },
    });

    let material = await prisma.material.findFirst({
      where: { contentId, type: 'IMAGE', role },
      orderBy: { createdAt: 'desc' },
    });
    if (!material) {
      throw new Error('IMAGE Agent 执行完成但未写入素材');
    }

    if (options.versionId || platform) {
      const prevMeta =
        material.meta && typeof material.meta === 'object'
          ? (material.meta as Record<string, unknown>)
          : {};
      material = await prisma.material.update({
        where: { id: material.id },
        data: {
          meta: {
            ...prevMeta,
            ...(options.versionId ? { versionId: options.versionId } : {}),
            ...(platform ? { platform } : {}),
          },
        },
      });
    }

    return {
      material,
      mode: 'generate' as const,
      agentRunId: agentRun?.id,
    };
  }
}

/** 一键生成流程：为各平台版本生成封面图 */
export async function orchestrateCoverImages(
  contentId: string,
  platforms: Platform[],
  accountId?: string
) {
  const versions = await prisma.contentVersion.findMany({
    where: { contentId, platform: { in: platforms } },
  });

  const materials = [];
  for (const version of versions) {
    try {
      const result = await orchestrateImageGeneration(contentId, {
        role: 'COVER',
        platform: version.platform,
        versionId: version.id,
        accountId,
      });
      materials.push(result.material);
    } catch (error) {
      console.warn(
        `[cover-image] ${version.platform} 封面生成失败:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  return materials;
}
