/** 各平台正文排版习惯，注入 REWRITE Agent 提示词 */
export const PLATFORM_BODY_GUIDES: Record<string, string> = {
  XIAOHONGSHU:
    '小红书正文：短段（每段 1–3 行）、话题感、适度 emoji、清单体/对比体、结尾引导收藏评论；避免长 wall of text',
  WECHAT:
    '公众号正文：小标题（##）分段、引用块（>）强调金句、有序/无序列表、段落 3–5 行、适度 emoji；专业可信或情绪共鸣',
  DOUYIN:
    '抖音文案：口播/字幕式短句、强节奏、一行一句、标签放文末；正文配图 0–1 张即可，偏视频脚本感',
  VIDEO_CHANNEL: '视频号：类似抖音但语气略沉稳；短句+场景描述；配图 0–1 张',
  ZHIHU:
    '知乎：理性论述、小标题清晰、数据/论点分点、适度加粗重点；段落可略长但需层次',
  BILIBILI: 'B站：年轻化表达、梗与干货结合、分段清晰、可带互动提问',
};

export function getPlatformBodyGuide(platform?: string): string {
  if (!platform) return PLATFORM_BODY_GUIDES.WECHAT;
  return (
    PLATFORM_BODY_GUIDES[platform] ??
    `平台 ${platform}：移动端扫读、短段、小标题、信息密度适中`
  );
}
