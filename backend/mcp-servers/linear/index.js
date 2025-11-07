#!/usr/bin/env node

/**
 * Linear MCP Server
 *
 * Project management and issue tracking via Linear's GraphQL API
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

console.error('Linear MCP Server starting...');

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;

if (!LINEAR_API_KEY) {
  console.error('ERROR: LINEAR_API_KEY environment variable is required');
  process.exit(1);
}

const LINEAR_API_URL = 'https://api.linear.app/graphql';

async function callLinear(query, variables = {}) {
  const response = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': LINEAR_API_KEY,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Linear API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  if (result.errors) {
    throw new Error(`Linear GraphQL error: ${JSON.stringify(result.errors)}`);
  }

  return result.data;
}

const server = new Server(
  { name: 'linear-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_issues',
        description: 'List issues from Linear workspace',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 10 },
            filter: { type: 'string', description: 'Filter (e.g., state.name = "In Progress")' },
          },
        },
      },
      {
        name: 'create_issue',
        description: 'Create a new issue in Linear',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            teamId: { type: 'string', description: 'Team ID (optional)' },
          },
          required: ['title'],
        },
      },
      {
        name: 'update_issue',
        description: 'Update an existing Linear issue',
        inputSchema: {
          type: 'object',
          properties: {
            issueId: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            stateId: { type: 'string' },
          },
          required: ['issueId'],
        },
      },
      {
        name: 'search_issues',
        description: 'Search Linear issues',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
          },
          required: ['query'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_issues': {
        const { limit = 10 } = args;
        const data = await callLinear(`
          query {
            issues(first: ${limit}) {
              nodes {
                id
                title
                description
                state { name }
                assignee { name }
                createdAt
              }
            }
          }
        `);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(data.issues.nodes, null, 2),
          }],
        };
      }

      case 'create_issue': {
        const { title, description = '', teamId } = args;
        const data = await callLinear(`
          mutation($input: IssueCreateInput!) {
            issueCreate(input: $input) {
              issue {
                id
                title
                url
              }
            }
          }
        `, {
          input: { title, description, ...(teamId && { teamId }) },
        });
        return {
          content: [{
            type: 'text',
            text: `Issue created: ${data.issueCreate.issue.title}\nURL: ${data.issueCreate.issue.url}`,
          }],
        };
      }

      case 'update_issue': {
        const { issueId, ...updates } = args;
        const data = await callLinear(`
          mutation($id: String!, $input: IssueUpdateInput!) {
            issueUpdate(id: $id, input: $input) {
              issue {
                id
                title
                state { name }
              }
            }
          }
        `, { id: issueId, input: updates });
        return {
          content: [{
            type: 'text',
            text: `Issue updated: ${data.issueUpdate.issue.title}`,
          }],
        };
      }

      case 'search_issues': {
        const { query } = args;
        const data = await callLinear(`
          query {
            issueSearch(query: "${query}") {
              nodes {
                id
                title
                description
                state { name }
              }
            }
          }
        `);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(data.issueSearch.nodes, null, 2),
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
  console.error('Linear MCP Server running');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
