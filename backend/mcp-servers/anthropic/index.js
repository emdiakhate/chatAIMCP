#!/usr/bin/env node

/**
 * Anthropic (Claude) MCP Server
 *
 * Provides access to Claude AI models via the Anthropic API.
 * Supports text generation, code analysis, and long-context processing.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

console.error('Anthropic MCP Server starting...');

// API Key will be provided via environment variable by the MCP client manager
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.error('ERROR: ANTHROPIC_API_KEY environment variable is required');
  process.exit(1);
}

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1';
const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';

/**
 * Call Anthropic API
 */
async function callAnthropic(endpoint, body) {
  const response = await fetch(`${ANTHROPIC_API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Create the MCP server
 */
const server = new Server(
  {
    name: 'anthropic-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
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
        name: 'claude_complete',
        description: 'Generate text completion using Claude AI. Best for single-turn requests like writing, analysis, or code generation.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'The prompt for Claude to complete',
            },
            model: {
              type: 'string',
              description: 'Claude model to use (default: claude-3-5-sonnet-20241022). Options: claude-3-5-sonnet-20241022, claude-3-opus-20240229, claude-3-haiku-20240307',
              default: DEFAULT_MODEL,
            },
            max_tokens: {
              type: 'number',
              description: 'Maximum tokens to generate (default: 4096)',
              default: 4096,
            },
            temperature: {
              type: 'number',
              description: 'Temperature for randomness (0-1, default: 1)',
              default: 1,
            },
          },
          required: ['prompt'],
        },
      },
      {
        name: 'claude_chat',
        description: 'Have a multi-turn conversation with Claude. Maintains context across messages.',
        inputSchema: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              description: 'Array of messages with role (user/assistant) and content',
              items: {
                type: 'object',
                properties: {
                  role: {
                    type: 'string',
                    enum: ['user', 'assistant'],
                  },
                  content: {
                    type: 'string',
                  },
                },
                required: ['role', 'content'],
              },
            },
            model: {
              type: 'string',
              description: 'Claude model to use',
              default: DEFAULT_MODEL,
            },
            max_tokens: {
              type: 'number',
              description: 'Maximum tokens to generate',
              default: 4096,
            },
          },
          required: ['messages'],
        },
      },
      {
        name: 'analyze_code',
        description: 'Analyze code for bugs, improvements, and best practices using Claude. Provides detailed code review.',
        inputSchema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'The code to analyze',
            },
            language: {
              type: 'string',
              description: 'Programming language (e.g., python, javascript, typescript)',
            },
            focus: {
              type: 'string',
              description: 'What to focus on (e.g., bugs, performance, security, readability)',
              default: 'all',
            },
          },
          required: ['code'],
        },
      },
      {
        name: 'summarize_text',
        description: 'Summarize long text or documents using Claude. Can handle up to 200K tokens.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The text to summarize',
            },
            length: {
              type: 'string',
              description: 'Desired summary length',
              enum: ['brief', 'medium', 'detailed'],
              default: 'medium',
            },
          },
          required: ['text'],
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
      case 'claude_complete': {
        const { prompt, model = DEFAULT_MODEL, max_tokens = 4096, temperature = 1 } = args;

        const result = await callAnthropic('/messages', {
          model,
          max_tokens,
          temperature,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const responseText = result.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      }

      case 'claude_chat': {
        const { messages, model = DEFAULT_MODEL, max_tokens = 4096 } = args;

        const result = await callAnthropic('/messages', {
          model,
          max_tokens,
          messages,
        });

        const responseText = result.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      }

      case 'analyze_code': {
        const { code, language = 'unknown', focus = 'all' } = args;

        const prompt = `Analyze the following ${language} code and provide feedback focusing on: ${focus}.

Code:
\`\`\`${language}
${code}
\`\`\`

Please provide:
1. Overall code quality assessment
2. Bugs or potential issues
3. Performance improvements
4. Security concerns
5. Best practices recommendations
6. Refactoring suggestions`;

        const result = await callAnthropic('/messages', {
          model: DEFAULT_MODEL,
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const responseText = result.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      }

      case 'summarize_text': {
        const { text, length = 'medium' } = args;

        const lengthInstructions = {
          brief: 'Provide a very brief 2-3 sentence summary',
          medium: 'Provide a concise paragraph summary',
          detailed: 'Provide a comprehensive multi-paragraph summary',
        };

        const prompt = `${lengthInstructions[length]} of the following text:

${text}`;

        const result = await callAnthropic('/messages', {
          model: DEFAULT_MODEL,
          max_tokens: 2048,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const responseText = result.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: responseText,
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
    console.error(`[Anthropic MCP] Error executing ${name}:`, error);
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
  console.error('Anthropic MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
