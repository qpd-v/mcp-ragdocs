import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ApiClient } from '../api-client.js';
import { BaseHandler } from './base-handler.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const QUEUE_FILE = path.join(__dirname, '..', '..', 'queue.txt');

export class QueueDocumentationHandler extends BaseHandler {
  constructor(server: Server, apiClient: ApiClient) {
    super(server, apiClient);
  }

  async handle(args: any) {
    if (!Array.isArray(args.urls)) {
      throw new McpError(ErrorCode.InvalidParams, 'urls must be an array');
    }

    if (args.urls.length === 0) {
      throw new McpError(ErrorCode.InvalidParams, 'urls array cannot be empty');
    }

    if (!args.urls.every((url: string) => typeof url === 'string')) {
      throw new McpError(ErrorCode.InvalidParams, 'all urls must be strings');
    }

    try {
      // Ensure queue file exists
      try {
        await fs.access(QUEUE_FILE);
      } catch {
        await fs.writeFile(QUEUE_FILE, '');
      }

      // Append URLs to queue file
      const urlsToAdd = args.urls.join('\n') + '\n';
      await fs.appendFile(QUEUE_FILE, urlsToAdd);

      return {
        content: [
          {
            type: 'text',
            text: `Successfully queued ${args.urls.length} URLs for processing`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to queue URLs: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }
}