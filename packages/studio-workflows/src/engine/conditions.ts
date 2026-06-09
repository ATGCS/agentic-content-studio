import { canGenerateImages } from '@acs/image-provider';
import type { WorkflowContext } from './types.js';

export function evaluateCondition(
  expression: string | undefined,
  ctx: WorkflowContext
): boolean {
  if (!expression?.trim()) return true;

  return expression
    .split('&&')
    .map((part) => part.trim())
    .every((part) => evaluateAtom(part, ctx));
}

function evaluateAtom(atom: string, ctx: WorkflowContext): boolean {
  const negated = atom.startsWith('!');
  const key = negated ? atom.slice(1).trim() : atom;

  let value = false;
  switch (key) {
    case 'canGenerateImages':
      value = canGenerateImages();
      break;
    case 'hasImageSlots':
      value = Boolean(ctx.vars.hasImageSlots);
      break;
    default:
      value = Boolean(ctx.vars[key]);
  }

  return negated ? !value : value;
}
