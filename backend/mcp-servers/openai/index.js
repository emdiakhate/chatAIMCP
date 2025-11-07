#!/usr/bin/env node

/**
 * OpenAI MCP Server
 *
 * Provides access to OpenAI's GPT models, embeddings, and DALL-E.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

console.error('OpenAI MCP Server starting...');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

const OPENAI_API_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4-turbo-preview';

async function callOpenAI(endpoint, body) {
  const response = await fetch(`${OPENAI_API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  return response.json();
}

const server = new Server(
  {
    name: 'openai-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'gpt_complete',
        description: 'Generate text using GPT models (GPT-4, GPT-3.5)',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: { type: 'string', description: 'The prompt for GPT' },
            model: { type: 'string', default: DEFAULT_MODEL },
            max_tokens: { type: 'number', default: 1000 },
          },
          required: ['prompt'],
        },
      },
      {
        name: 'create_embeddings',
        description: 'Generate embeddings for text',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to embed' },
            model: { type: 'string', default: 'text-embedding-3-small' },
          },
          required: ['text'],
        },
      },
      {
        name: 'generate_image',
        description: 'Generate image using DALL-E',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: { type: 'string', description: 'Image description' },
            size: { type: 'string', enum: ['1024x1024', '1792x1024', '1024x1792'], default: '1024x1024' },
          },
          required: ['prompt'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'gpt_complete': {
        const { prompt, model = DEFAULT_MODEL, max_tokens = 1000 } = args;
        const result = await callOpenAI('/chat/completions', {
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens,
        });
        return {
          content: [{
            type: 'text',
            text: result.choices[0].message.content,
          }],
        };
      }

      case 'create_embeddings': {
        const { text, model = 'text-embedding-3-small' } = args;
        const result = await callOpenAI('/embeddings', {
          model,
          input: text,
        });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result.data[0].embedding),
          }],
        };
      }

      case 'generate_image': {
        const { prompt, size = '1024x1024' } = args;
        const result = await callOpenAI('/images/generations', {
          model: 'dall-e-3',
          prompt,
          size,
          n: 1,
        });
        return {
          content: [{
            type: 'text',
            text: `Image generated: ${result.data[0].url}`,
          }],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('OpenAI MCP Server running');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
