import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ApiClient } from '../api-client.js';
import { McpToolResponse } from '../types.js';

export abstract class BaseHandler {
  protected server: Server;
  protected apiClient: ApiClient;

  constructor(server: Server, apiClient: ApiClient) {
    this.server = server;
    this.apiClient = apiClient;
  }

  protected abstract handle(args: any): Promise<McpToolResponse>;
}