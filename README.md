# MCP-Ragdocs
[![smithery badge](https://smithery.ai/badge/@qpd-v/mcp-server-ragdocs)](https://smithery.ai/server/@qpd-v/mcp-server-ragdocs)

A Model Context Protocol (MCP) server that enables semantic search and retrieval of documentation using a vector database (Qdrant). This server allows you to add documentation from URLs or local files and then search through them using natural language queries.

## Version

Current version: 0.1.6

## Features

- Add documentation from URLs or local files
- Store documentation in a vector database for semantic search
- Search through documentation using natural language
- List all documentation sources

## Installation

### Installing via Smithery

To install RAGDocs for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@qpd-v/mcp-server-ragdocs):

```bash
npx -y @smithery/cli install @qpd-v/mcp-server-ragdocs --client claude
```

### Manual Installation
Install globally using npm:

```bash
npm install -g @qpd-v/mcp-server-ragdocs
```

This will install the server in your global npm directory, which you'll need for the configuration steps below.

## Requirements

- Node.js 16 or higher
- Qdrant (either local or cloud)
- One of the following for embeddings:
  - Ollama running locally (default, free)
  - OpenAI API key (optional, paid)

## Qdrant Setup Options

### Option 1: Local Qdrant

1. Using Docker (recommended):
```bash
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant
```

2. Or download from [Qdrant's website](https://qdrant.tech/documentation/quick-start/)

### Option 2: Qdrant Cloud

1. Create an account at [Qdrant Cloud](https://cloud.qdrant.io/)
2. Create a new cluster
3. Get your cluster URL and API key from the dashboard
4. Use these in your configuration (see Configuration section below)

## Configuration

The server can be used with both Cline and Claude Desktop. Configuration differs slightly between them:

### Cline Configuration

Add to your Cline settings file (`%AppData%\Code\User\globalStorage\rooveterinaryinc.roo-cline\settings\cline_mcp_settings.json`):

1. Using npm global install (recommended):
```json
{
		"mcpServers": {
				"ragdocs": {
						"command": "node",
      "args": ["C:/Users/YOUR_USERNAME/AppData/Roaming/npm/node_modules/@qpd-v/mcp-server-ragdocs/build/index.js"],
      "env": {
        "QDRANT_URL": "http://127.0.0.1:6333",
        "EMBEDDING_PROVIDER": "ollama",
        "OLLAMA_URL": "http://localhost:11434"
      }
    }
  }
}
```

For OpenAI instead of Ollama:
```json
{
		"mcpServers": {
				"ragdocs": {
						"command": "node",
      "args": ["C:/Users/YOUR_USERNAME/AppData/Roaming/npm/node_modules/@qpd-v/mcp-server-ragdocs/build/index.js"],
      "env": {
        "QDRANT_URL": "http://127.0.0.1:6333",
        "EMBEDDING_PROVIDER": "openai",
        "OPENAI_API_KEY": "your-openai-api-key"
      }
    }
  }
}
```

2. Using local development setup:
```json
{
		"mcpServers": {
				"ragdocs": {
						"command": "node",
						"args": ["PATH_TO_PROJECT/mcp-ragdocs/build/index.js"],
						"env": {
								"QDRANT_URL": "http://127.0.0.1:6333",
								"EMBEDDING_PROVIDER": "ollama",
								"OLLAMA_URL": "http://localhost:11434"
						}
				}
		}
}
```

### Claude Desktop Configuration

Add to your Claude Desktop config file:
- Windows: `%AppData%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

1. Windows Setup with Ollama (using full paths):
```json
{
  "mcpServers": {
    "ragdocs": {
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": [
        "C:\\Users\\YOUR_USERNAME\\AppData\\Roaming\\npm\\node_modules\\@qpd-v/mcp-server-ragdocs\\build\\index.js"
      ],
      "env": {
								"QDRANT_URL": "http://127.0.0.1:6333",
								"EMBEDDING_PROVIDER": "ollama",
								"OLLAMA_URL": "http://localhost:11434"
						}
				}
		}
}
```

Windows Setup with OpenAI:
```json
{
		"mcpServers": {
				"ragdocs": {
						"command": "C:\\Program Files\\nodejs\\node.exe",
						"args": [
								"C:\\Users\\YOUR_USERNAME\\AppData\\Roaming\\npm\\node_modules\\@qpd-v/mcp-server-ragdocs\\build\\index.js"
						],
						"env": {
								"QDRANT_URL": "http://127.0.0.1:6333",
								"EMBEDDING_PROVIDER": "openai",
								"OPENAI_API_KEY": "your-openai-api-key"
						}
				}
		}
}
```

2. macOS Setup with Ollama:
```json
{
		"mcpServers": {
				"ragdocs": {
						"command": "/usr/local/bin/node",
						"args": [
								"/usr/local/lib/node_modules/@qpd-v/mcp-server-ragdocs/build/index.js"
						],
						"env": {
								"QDRANT_URL": "http://127.0.0.1:6333",
								"EMBEDDING_PROVIDER": "ollama",
								"OLLAMA_URL": "http://localhost:11434"
						}
				}
		}
}
```

### Qdrant Cloud Configuration

For either Cline or Claude Desktop, when using Qdrant Cloud, modify the env section:

With Ollama:
```json
{
		"env": {
				"QDRANT_URL": "https://your-cluster-url.qdrant.tech",
				"QDRANT_API_KEY": "your-qdrant-api-key",
				"EMBEDDING_PROVIDER": "ollama",
				"OLLAMA_URL": "http://localhost:11434"
		}
}
```

With OpenAI:
```json
{
		"env": {
				"QDRANT_URL": "https://your-cluster-url.qdrant.tech",
				"QDRANT_API_KEY": "your-qdrant-api-key",
				"EMBEDDING_PROVIDER": "openai",
				"OPENAI_API_KEY": "your-openai-api-key"
		}
}
```

### Environment Variables

#### Qdrant Configuration
- `QDRANT_URL` (required): URL of your Qdrant instance
  - For local: http://localhost:6333
  - For cloud: https://your-cluster-url.qdrant.tech
- `QDRANT_API_KEY` (required for cloud): Your Qdrant Cloud API key

#### Embeddings Configuration
- `EMBEDDING_PROVIDER` (optional): Choose between 'ollama' (default) or 'openai'
- `EMBEDDING_MODEL` (optional):
  - For Ollama: defaults to 'nomic-embed-text'
  - For OpenAI: defaults to 'text-embedding-3-small'
- `OLLAMA_URL` (optional): URL of your Ollama instance (defaults to http://localhost:11434)
- `OPENAI_API_KEY` (required if using OpenAI): Your OpenAI API key

## Available Tools

1. `add_documentation`
   - Add documentation from a URL to the RAG database
   - Parameters:
     - `url`: URL of the documentation to fetch

2. `search_documentation`
   - Search through stored documentation
   - Parameters:
     - `query`: Search query
     - `limit` (optional): Maximum number of results to return (default: 5)

3. `list_sources`
   - List all documentation sources currently stored
   - No parameters required

## Example Usage

In Claude Desktop or any other MCP-compatible client:

1. Add documentation:
```
Add this documentation: https://docs.example.com/api
```

2. Search documentation:
```
Search the documentation for information about authentication
```

3. List sources:
```
What documentation sources are available?
```

## Development

1. Clone the repository:
```bash
git clone https://github.com/qpd-v/mcp-server-ragdocs.git
cd mcp-server-ragdocs
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Run locally:
```bash
npm start
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
