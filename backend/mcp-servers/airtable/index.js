#!/usr/bin/env node

/**
 * Airtable MCP Server
 *
 * Spreadsheet database operations via Airtable REST API
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

console.error('Airtable MCP Server starting...');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

if (!AIRTABLE_API_KEY) {
  console.error('ERROR: AIRTABLE_API_KEY environment variable is required');
  process.exit(1);
}

const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

async function callAirtable(endpoint, options = {}) {
  const response = await fetch(`${AIRTABLE_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Airtable API error: ${response.status} - ${error}`);
  }

  return response.json();
}

const server = new Server(
  { name: 'airtable-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_records',
        description: 'List records from an Airtable table',
        inputSchema: {
          type: 'object',
          properties: {
            baseId: { type: 'string', description: 'Base ID (e.g., appXXXXXXXX)' },
            tableName: { type: 'string', description: 'Table name' },
            maxRecords: { type: 'number', default: 100 },
          },
          required: ['baseId', 'tableName'],
        },
      },
      {
        name: 'create_record',
        description: 'Create a new record in Airtable',
        inputSchema: {
          type: 'object',
          properties: {
            baseId: { type: 'string' },
            tableName: { type: 'string' },
            fields: { type: 'object', description: 'Record fields as JSON object' },
          },
          required: ['baseId', 'tableName', 'fields'],
        },
      },
      {
        name: 'update_record',
        description: 'Update an existing Airtable record',
        inputSchema: {
          type: 'object',
          properties: {
            baseId: { type: 'string' },
            tableName: { type: 'string' },
            recordId: { type: 'string' },
            fields: { type: 'object' },
          },
          required: ['baseId', 'tableName', 'recordId', 'fields'],
        },
      },
      {
        name: 'delete_record',
        description: 'Delete an Airtable record',
        inputSchema: {
          type: 'object',
          properties: {
            baseId: { type: 'string' },
            tableName: { type: 'string' },
            recordId: { type: 'string' },
          },
          required: ['baseId', 'tableName', 'recordId'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_records': {
        const { baseId, tableName, maxRecords = 100 } = args;
        const data = await callAirtable(
          `/${baseId}/${encodeURIComponent(tableName)}?maxRecords=${maxRecords}`
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(data.records, null, 2),
          }],
        };
      }

      case 'create_record': {
        const { baseId, tableName, fields } = args;
        const data = await callAirtable(
          `/${baseId}/${encodeURIComponent(tableName)}`,
          {
            method: 'POST',
            body: JSON.stringify({ fields }),
          }
        );
        return {
          content: [{
            type: 'text',
            text: `Record created: ${data.id}\n${JSON.stringify(data.fields, null, 2)}`,
          }],
        };
      }

      case 'update_record': {
        const { baseId, tableName, recordId, fields } = args;
        const data = await callAirtable(
          `/${baseId}/${encodeURIComponent(tableName)}/${recordId}`,
          {
            method: 'PATCH',
            body: JSON.stringify({ fields }),
          }
        );
        return {
          content: [{
            type: 'text',
            text: `Record updated: ${data.id}\n${JSON.stringify(data.fields, null, 2)}`,
          }],
        };
      }

      case 'delete_record': {
        const { baseId, tableName, recordId } = args;
        await callAirtable(
          `/${baseId}/${encodeURIComponent(tableName)}/${recordId}`,
          { method: 'DELETE' }
        );
        return {
          content: [{
            type: 'text',
            text: `Record deleted: ${recordId}`,
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
  console.error('Airtable MCP Server running');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
