#!/usr/bin/env node

/**
 * Filesystem MCP Server
 *
 * Provides safe access to local files within allowed directories.
 * Implements the Model Context Protocol for file operations.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';

// Get allowed paths from environment or use default
const ALLOWED_PATHS = process.env.FILESYSTEM_ALLOWED_PATHS
  ? process.env.FILESYSTEM_ALLOWED_PATHS.split(',').map(p => p.trim())
  : [process.cwd()];

console.error('Filesystem MCP Server starting...');
console.error('Allowed paths:', ALLOWED_PATHS);

/**
 * Check if a path is within allowed directories
 */
function isPathAllowed(filePath) {
  const normalized = path.resolve(filePath);
  return ALLOWED_PATHS.some(allowedPath => {
    const resolvedAllowed = path.resolve(allowedPath);
    return normalized.startsWith(resolvedAllowed);
  });
}

/**
 * Create the MCP server
 */
const server = new Server(
  {
    name: 'filesystem-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'read_file',
        description: 'Read the contents of a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file to read',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'write_file',
        description: 'Write content to a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file to write',
            },
            content: {
              type: 'string',
              description: 'Content to write to the file',
            },
          },
          required: ['path', 'content'],
        },
      },
      {
        name: 'list_directory',
        description: 'List files and directories in a given path',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the directory to list',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'search_files',
        description: 'Search for files by name pattern',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              description: 'Pattern to search for (supports wildcards)',
            },
            directory: {
              type: 'string',
              description: 'Directory to search in (optional, defaults to allowed paths)',
            },
          },
          required: ['pattern'],
        },
      },
      {
        name: 'create_directory',
        description: 'Create a new directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the directory to create',
            },
          },
          required: ['path'],
        },
      },
    ],
  };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'read_file': {
        const filePath = args.path;

        if (!isPathAllowed(filePath)) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Access denied. Path ${filePath} is not in allowed directories.`,
              },
            ],
          };
        }

        const content = await fs.readFile(filePath, 'utf-8');

        return {
          content: [
            {
              type: 'text',
              text: content,
            },
          ],
        };
      }

      case 'write_file': {
        const filePath = args.path;
        const content = args.content;

        if (!isPathAllowed(filePath)) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Access denied. Path ${filePath} is not in allowed directories.`,
              },
            ],
          };
        }

        await fs.writeFile(filePath, content, 'utf-8');

        return {
          content: [
            {
              type: 'text',
              text: `Successfully wrote ${content.length} characters to ${filePath}`,
            },
          ],
        };
      }

      case 'list_directory': {
        const dirPath = args.path;

        if (!isPathAllowed(dirPath)) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Access denied. Path ${dirPath} is not in allowed directories.`,
              },
            ],
          };
        }

        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const files = entries.map(entry => ({
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
          path: path.join(dirPath, entry.name),
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(files, null, 2),
            },
          ],
        };
      }

      case 'search_files': {
        const pattern = args.pattern;
        const searchDir = args.directory || ALLOWED_PATHS[0];

        if (!isPathAllowed(searchDir)) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Access denied. Path ${searchDir} is not in allowed directories.`,
              },
            ],
          };
        }

        // Simple recursive search
        const results = [];
        async function search(dir) {
          const entries = await fs.readdir(dir, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
              try {
                await search(fullPath);
              } catch (e) {
                // Skip directories we can't access
              }
            } else if (entry.name.includes(pattern)) {
              results.push(fullPath);
            }
          }
        }

        await search(searchDir);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ matches: results, count: results.length }, null, 2),
            },
          ],
        };
      }

      case 'create_directory': {
        const dirPath = args.path;

        if (!isPathAllowed(dirPath)) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Access denied. Path ${dirPath} is not in allowed directories.`,
              },
            ],
          };
        }

        await fs.mkdir(dirPath, { recursive: true });

        return {
          content: [
            {
              type: 'text',
              text: `Successfully created directory ${dirPath}`,
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Filesystem MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
