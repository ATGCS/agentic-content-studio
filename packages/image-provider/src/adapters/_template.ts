/**
 * 新增图片厂商模板（OpenAI / 阿里云通义万相等）：
 *
 * 1. 新建 packages/<vendor>-image-provider（或在本目录 adapters/ 内实现）
 * 2. 实现 ImageProviderAdapter 接口（见 ../types.ts）
 * 3. 在 ../registry.ts 的 BUILTIN_ADAPTERS 中 register
 * 4. .env 设置 IMAGE_PROVIDER=<id>
 *
 * 示例：
 *
 * export const openaiImageAdapter: ImageProviderAdapter = {
 *   id: 'openai',
 *   label: 'OpenAI GPT Image',
 *   materialSource: 'openai-gpt-image',
 *   isConfigured: () => Boolean(process.env.OPENAI_API_KEY),
 *   canGenerate: () => ...,
 *   resolveImageSize: (platform, role, aspectRatio) => ...,
 *   generateImage: async (input) => ...,
 *   editImage: async (prompt, sourceImage, size) => ...,
 * };
 */

export {};
