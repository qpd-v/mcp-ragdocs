import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ApiClient } from '../api-client.js';
import { BaseHandler } from './base-handler.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const QUEUE_FILE = path.join(__dirname, '..', '..', 'queue.txt');

export class ListQueueHandler extends BaseHandler {
  constructor(server: Server, apiClient: ApiClient) {
    super(server, apiClient);
  }

  async handle(_args: any) {
    try {
      // Check if queue file exists
      try {
        await fs.access(QUEUE_FILE);
      } catch {
        return {
          content: [
            {
              type: 'text',
              text: 'Queue is empty (queue file does not exist)',
            },
          ],
        };
      }

      // Read queue file
      const content = await fs.readFile(QUEUE_FILE, 'utf-8');
      const urls = content.split('\n').filter(url => url.trim() !== '');

      if (urls.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'Queue is empty',
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Queue contains ${urls.length} URLs:\n${urls.join('\n')}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to read queue: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }
}