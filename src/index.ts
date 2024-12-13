#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ApiClient } from './api-client.js';
import { HandlerRegistry } from './handler-registry.js';

class RagDocsServer {
  private server: Server;
  private apiClient: ApiClient;
  private handlerRegistry: HandlerRegistry;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-ragdocs',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.apiClient = new ApiClient();
    this.handlerRegistry = new HandlerRegistry(this.server, this.apiClient);
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.cleanup();
      process.exit(0);
    });
  }

  private async cleanup() {
    await this.apiClient.cleanup();
    await this.server.close();
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('RAG Docs MCP server running on stdio');
  }
}

const server = new RagDocsServer();
server.run().catch(console.error);