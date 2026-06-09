/** 各平台封面视觉习惯，注入 IMAGE Agent 提示词 */
export const PLATFORM_COVER_GUIDES: Record<string, string> = {
  XIAOHONGSHU:
    '小红书：竖版3:4；生活方式/知识干货/对比图；色彩明快；主体居中或偏上；顶部或中部留 30% 纯色/渐变区域供叠标题；避免杂乱文字入图',
  WECHAT:
    '公众号：横版16:9；场景图/信息图/人物+场景；专业可信或情绪共鸣；左侧或上方留白叠标题；避免过多小字',
  DOUYIN:
    '抖音：竖版9:16；强对比、大主体、表情或动作张力；3秒内读懂主题；高饱和；人物面部或产品特写清晰',
  VIDEO_CHANNEL:
    '视频号：竖版9:16；类似抖音但略沉稳；真实场景、人物互动；标题区留白明显',
  ZHIHU:
    '知乎：横版16:9；理性、信息密度适中；图表/场景/概念可视化；专业感，少花哨滤镜',
  BILIBILI:
    'B站：横版16:9；二次元或实拍均可；标题党封面但内容相关；高对比、角色/场景明确',
};

export function getPlatformCoverGuide(platform?: string): string {
  if (!platform) return PLATFORM_COVER_GUIDES.XIAOHONGSHU;
  return (
    PLATFORM_COVER_GUIDES[platform] ??
    `平台 ${platform}：主体清晰、与标题强相关、预留叠字区`
  );
}
