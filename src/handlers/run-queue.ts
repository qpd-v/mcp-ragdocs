import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ApiClient } from '../api-client.js';
import { BaseHandler } from './base-handler.js';
import { McpToolResponse } from '../types.js';
import { AddDocumentationHandler } from './add-documentation.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const QUEUE_FILE = path.join(__dirname, '..', '..', 'queue.txt');

export class RunQueueHandler extends BaseHandler {
  private addDocHandler: AddDocumentationHandler;

  constructor(server: Server, apiClient: ApiClient) {
    super(server, apiClient);
    this.addDocHandler = new AddDocumentationHandler(server, apiClient);
  }

  async handle(_args: any): Promise<McpToolResponse> {
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

      let processedCount = 0;
      let failedCount = 0;
      const failedUrls: string[] = [];

      while (true) {
        // Read current queue
        const content = await fs.readFile(QUEUE_FILE, 'utf-8');
        const urls = content.split('\n').filter(url => url.trim() !== '');

        if (urls.length === 0) {
          break; // Queue is empty
        }

        const currentUrl = urls[0]; // Get first URL
        
        try {
          // Process the URL using add_documentation handler
          await this.addDocHandler.handle({ url: currentUrl });
          processedCount++;
        } catch (error) {
          failedCount++;
          failedUrls.push(currentUrl);
          console.error(`Failed to process URL ${currentUrl}:`, error);
        }

        // Remove the processed URL from queue
        const remainingUrls = urls.slice(1);
        await fs.writeFile(QUEUE_FILE, remainingUrls.join('\n') + (remainingUrls.length > 0 ? '\n' : ''));
      }

      let resultText = `Queue processing complete.\nProcessed: ${processedCount} URLs\nFailed: ${failedCount} URLs`;
      if (failedUrls.length > 0) {
        resultText += `\n\nFailed URLs:\n${failedUrls.join('\n')}`;
      }

      return {
        content: [
          {
            type: 'text',
            text: resultText,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to process queue: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }
}