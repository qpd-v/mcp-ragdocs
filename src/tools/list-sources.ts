import { BaseTool } from './base-tool';
import { ToolDefinition, McpToolResponse, isDocumentPayload } from '../types';
import { ApiClient } from '../api-client';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types';

const COLLECTION_NAME = 'documentation';

export class ListSourcesTool extends BaseTool {
  private apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    super();
    this.apiClient = apiClient;
  }

  get definition(): ToolDefinition {
    return {
      name: 'list_sources',
      description: 'List all documentation sources currently stored',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    };
  }

  async execute(args: any): Promise<McpToolResponse> {
    try {
      // Use pagination for better performance with large datasets
      const pageSize = 100;
      let offset = null;
      const sources = new Set<string>();
      
      while (true) {
        const scroll = await this.apiClient.qdrantClient.scroll(COLLECTION_NAME, {
          with_payload: true,
          with_vector: false, // Optimize network transfer
          limit: pageSize,
          offset,
        });

        if (scroll.points.length === 0) break;
        
        for (const point of scroll.points) {
          if (isDocumentPayload(point.payload)) {
            sources.add(`${point.payload.title} (${point.payload.url})`);
          }
        }

        if (scroll.points.length < pageSize) break;
        offset = scroll.points[scroll.points.length - 1].id;
      }

      return {
        content: [
          {
            type: 'text',
            text: Array.from(sources).join('\n') || 'No documentation sources found in the cloud collection.',
          },
        ],
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('unauthorized')) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            'Failed to authenticate with Qdrant cloud while listing sources'
          );
        } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
          throw new McpError(
            ErrorCode.InternalError,
            'Connection to Qdrant cloud failed while listing sources'
          );
        }
      }
      return {
        content: [
          {
            type: 'text',
            text: `Failed to list sources: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }
}