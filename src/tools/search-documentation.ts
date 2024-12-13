import { BaseTool } from './base-tool';
import { ToolDefinition, McpToolResponse, isDocumentPayload } from '../types';
import { ApiClient } from '../api-client';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types';

const COLLECTION_NAME = 'documentation';

export class SearchDocumentationTool extends BaseTool {
  private apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    super();
    this.apiClient = apiClient;
  }

  get definition(): ToolDefinition {
    return {
      name: 'search_documentation',
      description: 'Search through stored documentation',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return',
            default: 5,
          },
        },
        required: ['query'],
      },
    };
  }

  async execute(args: any): Promise<McpToolResponse> {
    if (!args.query || typeof args.query !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, 'Query is required');
    }

    const limit = args.limit || 5;

    try {
      const queryEmbedding = await this.apiClient.getEmbeddings(args.query);
      
      const searchResults = await this.apiClient.qdrantClient.search(COLLECTION_NAME, {
        vector: queryEmbedding,
        limit,
        with_payload: true,
        with_vector: false, // Optimize network transfer by not retrieving vectors
        score_threshold: 0.7, // Only return relevant results
      });

      const formattedResults = searchResults.map(result => {
        if (!isDocumentPayload(result.payload)) {
          throw new Error('Invalid payload type');
        }
        return `[${result.payload.title}](${result.payload.url})\nScore: ${result.score.toFixed(3)}\nContent: ${result.payload.text}\n`;
      }).join('\n---\n');

      return {
        content: [
          {
            type: 'text',
            text: formattedResults || 'No results found matching the query.',
          },
        ],
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('unauthorized')) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            'Failed to authenticate with Qdrant cloud while searching'
          );
        } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
          throw new McpError(
            ErrorCode.InternalError,
            'Connection to Qdrant cloud failed while searching'
          );
        }
      }
      return {
        content: [
          {
            type: 'text',
            text: `Search failed: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }
}