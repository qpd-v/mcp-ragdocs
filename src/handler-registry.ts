import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ApiClient } from './api-client.js';
import { ToolDefinition } from './types.js';
import {
  AddDocumentationHandler,
  SearchDocumentationHandler,
  ListSourcesHandler,
  ExtractUrlsHandler,
  RemoveDocumentationHandler,
  QueueDocumentationHandler,
  ListQueueHandler,
  RunQueueHandler,
} from './handlers/index.js';

const COLLECTION_NAME = 'documentation';

export class HandlerRegistry {
  private server: Server;
  private apiClient: ApiClient;
  private handlers: Map<string, any>;

  constructor(server: Server, apiClient: ApiClient) {
    this.server = server;
    this.apiClient = apiClient;
    this.handlers = new Map();
    this.setupHandlers();
    this.registerHandlers();
  }

  private setupHandlers() {
    this.handlers.set('add_documentation', new AddDocumentationHandler(this.server, this.apiClient));
    this.handlers.set('search_documentation', new SearchDocumentationHandler(this.server, this.apiClient));
    this.handlers.set('list_sources', new ListSourcesHandler(this.server, this.apiClient));
    this.handlers.set('extract_urls', new ExtractUrlsHandler(this.server, this.apiClient));
    this.handlers.set('remove_documentation', new RemoveDocumentationHandler(this.server, this.apiClient));
    this.handlers.set('queue_documentation', new QueueDocumentationHandler(this.server, this.apiClient));
    this.handlers.set('list_queue', new ListQueueHandler(this.server, this.apiClient));
    this.handlers.set('run_queue', new RunQueueHandler(this.server, this.apiClient));
  }

  private registerHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'add_documentation',
          description: 'Add documentation from a URL to the RAG database',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL of the documentation to fetch',
              },
            },
            required: ['url'],
          },
        } as ToolDefinition,
        {
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
        } as ToolDefinition,
        {
          name: 'list_sources',
          description: 'List all documentation sources currently stored',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        } as ToolDefinition,
        {
          name: 'extract_urls',
          description: 'Extract all URLs from a given web page',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL of the page to extract URLs from',
              },
              add_to_queue: {
                type: 'boolean',
                description: 'If true, automatically add extracted URLs to the queue',
                default: false,
              },
            },
            required: ['url'],
          },
        } as ToolDefinition,
        {
          name: 'remove_documentation',
          description: 'Remove documentation sources by URLs',
          inputSchema: {
            type: 'object',
            properties: {
              urls: {
                type: 'array',
                items: {
                  type: 'string',
                  description: 'URL of documentation source to remove',
                },
                description: 'Array of URLs to remove from the database',
              },
            },
            required: ['urls'],
          },
        } as ToolDefinition,
        {
          name: 'queue_documentation',
          description: 'Add URLs to the documentation processing queue',
          inputSchema: {
            type: 'object',
            properties: {
              urls: {
                type: 'array',
                items: {
                  type: 'string',
                  description: 'URL of documentation to queue',
                },
                description: 'Array of URLs to add to the queue',
              },
            },
            required: ['urls'],
          },
        } as ToolDefinition,
        {
          name: 'list_queue',
          description: 'List all URLs currently in the documentation processing queue',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        } as ToolDefinition,
        {
          name: 'run_queue',
          description: 'Process URLs from the queue one at a time until complete',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        } as ToolDefinition,
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      await this.apiClient.initCollection(COLLECTION_NAME);

      const handler = this.handlers.get(request.params.name);
      if (!handler) {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      const response = await handler.handle(request.params.arguments);
      return {
        _meta: {},
        ...response
      };
    });
  }
}