import { z } from 'zod';

export const platformSchema = z.enum([
  'WECHAT',
  'XIAOHONGSHU',
  'DOUYIN',
  'KUAISHOU',
  'VIDEO_CHANNEL',
  'BILIBILI',
  'ZHIHU',
  'OTHER',
]);
