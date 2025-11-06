#!/usr/bin/env node

/**
 * Gmail MCP Server
 *
 * Provides access to Gmail via the Gmail API
 * Requires Google OAuth2 credentials
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { google } from 'googleapis';

console.error('Gmail MCP Server starting...');

// Get credentials from environment
const ACCESS_TOKEN = process.env.GMAIL_ACCESS_TOKEN;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!ACCESS_TOKEN || !CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing required environment variables for Gmail authentication');
  process.exit(1);
}

/**
 * Create OAuth2 client
 */
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  'http://localhost:3001/auth/google/callback'
);

oauth2Client.setCredentials({
  access_token: ACCESS_TOKEN,
  refresh_token: REFRESH_TOKEN,
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

/**
 * Create the MCP server
 */
const server = new Server(
  {
    name: 'gmail-server',
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
        name: 'search_emails',
        description: 'Search for emails using Gmail search syntax',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Gmail search query (e.g., "from:user@example.com subject:important")',
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
              default: 10,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'read_email',
        description: 'Read the full content of a specific email',
        inputSchema: {
          type: 'object',
          properties: {
            email_id: {
              type: 'string',
              description: 'The ID of the email to read',
            },
          },
          required: ['email_id'],
        },
      },
      {
        name: 'send_email',
        description: 'Send an email',
        inputSchema: {
          type: 'object',
          properties: {
            to: {
              type: 'string',
              description: 'Recipient email address',
            },
            subject: {
              type: 'string',
              description: 'Email subject',
            },
            body: {
              type: 'string',
              description: 'Email body (plain text)',
            },
          },
          required: ['to', 'subject', 'body'],
        },
      },
      {
        name: 'list_threads',
        description: 'List email threads',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Optional search query to filter threads',
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of threads to return (default: 10)',
              default: 10,
            },
          },
        },
      },
    ],
  };
});

/**
 * Helper function to decode base64url
 */
function decodeBase64Url(str) {
  if (!str) return '';
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Helper function to get email header value
 */
function getHeader(headers, name) {
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header ? header.value : '';
}

/**
 * Helper function to get email body
 */
function getEmailBody(payload) {
  if (payload.body && payload.body.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body && part.body.data) {
        return decodeBase64Url(part.body.data);
      }
    }

    // Fallback to HTML if plain text not found
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body && part.body.data) {
        return decodeBase64Url(part.body.data);
      }
    }
  }

  return '';
}

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'search_emails': {
        const query = args.query;
        const maxResults = args.max_results || 10;

        const response = await gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults,
        });

        const messages = response.data.messages || [];

        // Get details for each message
        const detailedMessages = await Promise.all(
          messages.map(async (msg) => {
            const details = await gmail.users.messages.get({
              userId: 'me',
              id: msg.id,
              format: 'metadata',
              metadataHeaders: ['From', 'To', 'Subject', 'Date'],
            });

            const headers = details.data.payload.headers;

            return {
              id: msg.id,
              threadId: msg.threadId,
              from: getHeader(headers, 'From'),
              to: getHeader(headers, 'To'),
              subject: getHeader(headers, 'Subject'),
              date: getHeader(headers, 'Date'),
              snippet: details.data.snippet,
            };
          })
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  query,
                  count: detailedMessages.length,
                  emails: detailedMessages,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'read_email': {
        const emailId = args.email_id;

        const response = await gmail.users.messages.get({
          userId: 'me',
          id: emailId,
          format: 'full',
        });

        const message = response.data;
        const headers = message.payload.headers;
        const body = getEmailBody(message.payload);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  id: message.id,
                  threadId: message.threadId,
                  from: getHeader(headers, 'From'),
                  to: getHeader(headers, 'To'),
                  subject: getHeader(headers, 'Subject'),
                  date: getHeader(headers, 'Date'),
                  body: body.substring(0, 5000), // Limit body length
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'send_email': {
        const to = args.to;
        const subject = args.subject;
        const body = args.body;

        const email = [
          `To: ${to}`,
          `Subject: ${subject}`,
          '',
          body,
        ].join('\n');

        const encodedEmail = Buffer.from(email)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const response = await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedEmail,
          },
        });

        return {
          content: [
            {
              type: 'text',
              text: `Email sent successfully. Message ID: ${response.data.id}`,
            },
          ],
        };
      }

      case 'list_threads': {
        const query = args.query || '';
        const maxResults = args.max_results || 10;

        const response = await gmail.users.threads.list({
          userId: 'me',
          q: query,
          maxResults,
        });

        const threads = response.data.threads || [];

        // Get details for each thread
        const detailedThreads = await Promise.all(
          threads.map(async (thread) => {
            const details = await gmail.users.threads.get({
              userId: 'me',
              id: thread.id,
              format: 'metadata',
              metadataHeaders: ['From', 'Subject', 'Date'],
            });

            const firstMessage = details.data.messages[0];
            const headers = firstMessage.payload.headers;

            return {
              id: thread.id,
              messageCount: details.data.messages.length,
              subject: getHeader(headers, 'Subject'),
              from: getHeader(headers, 'From'),
              lastDate: getHeader(
                details.data.messages[details.data.messages.length - 1].payload.headers,
                'Date'
              ),
              snippet: firstMessage.snippet,
            };
          })
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: detailedThreads.length,
                  threads: detailedThreads,
                },
                null,
                2
              ),
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
  console.error('Gmail MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
