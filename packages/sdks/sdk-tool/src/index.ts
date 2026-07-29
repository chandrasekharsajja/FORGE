export function createTool(config: {
  name: string;
  description: string;
  parametersSchema: Record<string, any>;
  handler: (args: any) => Promise<any>;
}) {
  return {
    name: config.name,
    description: config.description,
    schema: config.parametersSchema,
    execute: config.handler
  };
}
