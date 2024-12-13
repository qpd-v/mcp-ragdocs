import { ToolDefinition, McpToolResponse } from '../types';

export abstract class BaseTool {
  abstract get definition(): ToolDefinition;
  abstract execute(args: unknown): Promise<McpToolResponse>;

  protected formatResponse(data: unknown): McpToolResponse {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  protected handleError(error: any): McpToolResponse {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error}`,
        },
      ],
      isError: true,
    };
  }
}