import { createTool } from '@platform/sdk-tool';

export const helloTool = createTool({
  name: 'hello_world_tool',
  description: 'First-party example tool created using @platform/sdk-tool',
  parametersSchema: {
    type: 'object',
    properties: {
      message: { type: 'string' }
    }
  },
  handler: async (args: { message: string }) => {
    return { output: `[Hello Tool Output]: ${args.message}` };
  }
});

console.log(`[Example] Initialized hello-tool example: ${helloTool.name}`);
