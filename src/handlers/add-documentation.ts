import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { BaseHandler } from './base-handler.js';
import { DocumentChunk, McpToolResponse } from '../types.js';
import * as cheerio from 'cheerio';
import crypto from 'crypto';

const COLLECTION_NAME = 'documentation';

export class AddDocumentationHandler extends BaseHandler {
  async handle(args: any): Promise<McpToolResponse> {
    if (!args.url || typeof args.url !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, 'URL is required');
    }

    try {
      const chunks = await this.fetchAndProcessUrl(args.url);
      
      // Batch process chunks for better performance
      const batchSize = 100;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const points = await Promise.all(
          batch.map(async (chunk) => {
            const embedding = await this.apiClient.getEmbeddings(chunk.text);
            return {
              id: this.generatePointId(),
              vector: embedding,
              payload: {
                ...chunk,
                _type: 'DocumentChunk' as const,
              } as Record<string, unknown>,
            };
          })
        );

        try {
          await this.apiClient.qdrantClient.upsert(COLLECTION_NAME, {
            wait: true,
            points,
          });
        } catch (error) {
          if (error instanceof Error) {
            if (error.message.includes('unauthorized')) {
              throw new McpError(
                ErrorCode.InvalidRequest,
                'Failed to authenticate with Qdrant cloud while adding documents'
              );
            } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
              throw new McpError(
                ErrorCode.InternalError,
                'Connection to Qdrant cloud failed while adding documents'
              );
            }
          }
          throw error;
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: `Successfully added documentation from ${args.url} (${chunks.length} chunks processed in ${Math.ceil(chunks.length / batchSize)} batches)`,
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      return {
        content: [
          {
            type: 'text',
            text: `Failed to add documentation: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async fetchAndProcessUrl(url: string): Promise<DocumentChunk[]> {
    await this.apiClient.initBrowser();
    const page = await this.apiClient.browser.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      const content = await page.content();
      const $ = cheerio.load(content);
      
      // Remove script tags, style tags, and comments
      $('script').remove();
      $('style').remove();
      $('noscript').remove();
      
      // Extract main content
      const title = $('title').text() || url;
      const mainContent = $('main, article, .content, .documentation, body').text();
      
      // Split content into chunks
      const chunks = this.chunkText(mainContent, 1000);
      
      return chunks.map(chunk => ({
        text: chunk,
        url,
        title,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to fetch URL ${url}: ${error}`
      );
    } finally {
      await page.close();
    }
  }

  private chunkText(text: string, maxChunkSize: number): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    
    for (const word of words) {
      currentChunk.push(word);
      const currentLength = currentChunk.join(' ').length;
      
      if (currentLength >= maxChunkSize) {
        chunks.push(currentChunk.join(' '));
        currentChunk = [];
      }
    }
    
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }
    
    return chunks;
  }

  private generatePointId(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}