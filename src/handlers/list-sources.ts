import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { BaseHandler } from './base-handler.js';
import { McpToolResponse, isDocumentPayload } from '../types.js';

const COLLECTION_NAME = 'documentation';

interface Source {
  title: string;
  url: string;
}

interface GroupedSources {
  [domain: string]: {
    [subdomain: string]: Source[];
  };
}

export class ListSourcesHandler extends BaseHandler {
  private groupSourcesByDomainAndSubdomain(sources: Source[]): GroupedSources {
    const grouped: GroupedSources = {};

    for (const source of sources) {
      try {
        const url = new URL(source.url);
        const domain = url.hostname;
        const pathParts = url.pathname.split('/').filter(p => p);
        const subdomain = pathParts[0] || '/';

        if (!grouped[domain]) {
          grouped[domain] = {};
        }
        if (!grouped[domain][subdomain]) {
          grouped[domain][subdomain] = [];
        }
        grouped[domain][subdomain].push(source);
      } catch (error) {
        console.error(`Invalid URL: ${source.url}`);
      }
    }

    return grouped;
  }

  private formatGroupedSources(grouped: GroupedSources): string {
    const output: string[] = [];
    let domainCounter = 1;

    for (const [domain, subdomains] of Object.entries(grouped)) {
      output.push(`${domainCounter}. ${domain}`);
      
      // Create a Set of unique URL+title combinations
      const uniqueSources = new Map<string, Source>();
      for (const sources of Object.values(subdomains)) {
        for (const source of sources) {
          uniqueSources.set(source.url, source);
        }
      }

      // Convert to array and sort
      const sortedSources = Array.from(uniqueSources.values())
        .sort((a, b) => a.title.localeCompare(b.title));

      // Use letters for subdomain entries
      sortedSources.forEach((source, index) => {
        output.push(`${domainCounter}.${index + 1}. ${source.title} (${source.url})`);
      });

      output.push(''); // Add blank line between domains
      domainCounter++;
    }

    return output.join('\n');
  }

  async handle(): Promise<McpToolResponse> {
    try {
      await this.apiClient.initCollection(COLLECTION_NAME);
      
      const pageSize = 100;
      let offset = null;
      const sources: Source[] = [];
      
      while (true) {
        const scroll = await this.apiClient.qdrantClient.scroll(COLLECTION_NAME, {
          with_payload: true,
          with_vector: false,
          limit: pageSize,
          offset,
        });

        if (scroll.points.length === 0) break;
        
        for (const point of scroll.points) {
          if (point.payload && typeof point.payload === 'object' && 'url' in point.payload && 'title' in point.payload) {
            const payload = point.payload as any;
            sources.push({
              title: payload.title,
              url: payload.url
            });
          }
        }

        if (scroll.points.length < pageSize) break;
        offset = scroll.points[scroll.points.length - 1].id;
      }

      if (sources.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No documentation sources found.',
            },
          ],
        };
      }

      const grouped = this.groupSourcesByDomainAndSubdomain(sources);
      const formattedOutput = this.formatGroupedSources(grouped);

      return {
        content: [
          {
            type: 'text',
            text: formattedOutput,
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