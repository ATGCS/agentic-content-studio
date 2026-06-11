/** 各平台封面视觉习惯，注入 IMAGE Agent 提示词 */
export const PLATFORM_COVER_GUIDES: Record<string, string> = {
  XIAOHONGSHU:
    '小红书：竖版3:4；大字报/备忘录/手绘信息图/奶油莫兰迪或多巴胺配色；像博主笔记封面，生活感接地气；主标题3-8字、字大留白多；禁止商务风、企业蓝、西装会议室、科技渐变、SaaS宣传风',
  WECHAT:
    '公众号：横版16:9；场景图/信息图/人物+场景；情绪共鸣或真实生活场景；左侧或上方留白叠标题；避免过多小字与商务 stock 风',
  DOUYIN:
    '抖音：竖版9:16；真实生活场景或强对比大字；俯拍书桌/人脸表情/产品特写；自然光、少字高对比；禁止企业宣传海报风',
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
