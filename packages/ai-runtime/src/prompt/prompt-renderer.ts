import type { RuntimeVariables } from '../runtime/types.js';

export type RenderedPrompt = {
  text: string;
  missingVariables: string[];
};

export type PromptPreview = RenderedPrompt & {
  declaredVariables: string[];
  extraVariables: string[];
};

export function extractTemplateVariables(template: string): string[] {
  return Array.from(
    new Set(Array.from(template.matchAll(/\{\{(\w+)\}\}/g), (match) => match[1]))
  );
}

export function renderPrompt(template: string, variables: RuntimeVariables): RenderedPrompt {
  const missingVariables = new Set<string>();
  const text = template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    if (variables[key] === undefined) missingVariables.add(key);
    return variables[key] ?? '';
  });

  return { text, missingVariables: Array.from(missingVariables) };
}

export function previewPrompt(template: string, variables: RuntimeVariables): PromptPreview {
  const rendered = renderPrompt(template, variables);
  const declaredVariables = extractTemplateVariables(template);
  const declared = new Set(declaredVariables);
  const extraVariables = Object.keys(variables).filter((key) => !declared.has(key));

  return { ...rendered, declaredVariables, extraVariables };
}

export function renderTemplate(template: string, variables: RuntimeVariables): string {
  return renderPrompt(template, variables).text;
}
