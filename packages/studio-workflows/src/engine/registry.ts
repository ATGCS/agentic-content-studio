import type { WorkflowNodeHandler } from './types.js';

export class NodeRegistry {
  private readonly handlers = new Map<string, WorkflowNodeHandler>();

  register(id: string, handler: WorkflowNodeHandler): void {
    this.handlers.set(id, handler);
  }

  registerMany(nodes: Record<string, WorkflowNodeHandler>): void {
    for (const [id, handler] of Object.entries(nodes)) {
      this.register(id, handler);
    }
  }

  get(id: string): WorkflowNodeHandler {
    const handler = this.handlers.get(id);
    if (!handler) throw new Error(`workflow node not found: ${id}`);
    return handler;
  }

  has(id: string): boolean {
    return this.handlers.has(id);
  }
}

export const nodeRegistry = new NodeRegistry();
