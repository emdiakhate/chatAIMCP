#!/usr/bin/env node

/**
 * HubSpot MCP Server
 *
 * CRM and marketing automation via HubSpot REST API
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

console.error('HubSpot MCP Server starting...');

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

if (!HUBSPOT_API_KEY) {
  console.error('ERROR: HUBSPOT_API_KEY environment variable is required');
  process.exit(1);
}

const HUBSPOT_API_URL = 'https://api.hubapi.com';

async function callHubSpot(endpoint, options = {}) {
  const url = `${HUBSPOT_API_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HubSpot API error: ${response.status} - ${error}`);
  }

  return response.json();
}

const server = new Server(
  { name: 'hubspot-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_contacts',
        description: 'List contacts from HubSpot CRM',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 10 },
          },
        },
      },
      {
        name: 'create_contact',
        description: 'Create a new contact in HubSpot',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phone: { type: 'string' },
            company: { type: 'string' },
          },
          required: ['email'],
        },
      },
      {
        name: 'list_deals',
        description: 'List deals from HubSpot CRM',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 10 },
          },
        },
      },
      {
        name: 'create_deal',
        description: 'Create a new deal in HubSpot',
        inputSchema: {
          type: 'object',
          properties: {
            dealname: { type: 'string' },
            amount: { type: 'number' },
            dealstage: { type: 'string' },
            pipeline: { type: 'string' },
          },
          required: ['dealname'],
        },
      },
      {
        name: 'list_companies',
        description: 'List companies from HubSpot CRM',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 10 },
          },
        },
      },
      {
        name: 'search_contacts',
        description: 'Search contacts in HubSpot',
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
      case 'list_contacts': {
        const { limit = 10 } = args;
        const data = await callHubSpot(`/crm/v3/objects/contacts?limit=${limit}`);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(data.results, null, 2),
          }],
        };
      }

      case 'create_contact': {
        const { email, firstName, lastName, phone, company } = args;
        const properties = {
          email,
          ...(firstName && { firstname: firstName }),
          ...(lastName && { lastname: lastName }),
          ...(phone && { phone }),
          ...(company && { company }),
        };
        const data = await callHubSpot('/crm/v3/objects/contacts', {
          method: 'POST',
          body: JSON.stringify({ properties }),
        });
        return {
          content: [{
            type: 'text',
            text: `Contact created: ${data.id}\n${JSON.stringify(data.properties, null, 2)}`,
          }],
        };
      }

      case 'list_deals': {
        const { limit = 10 } = args;
        const data = await callHubSpot(`/crm/v3/objects/deals?limit=${limit}`);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(data.results, null, 2),
          }],
        };
      }

      case 'create_deal': {
        const { dealname, amount, dealstage, pipeline } = args;
        const properties = {
          dealname,
          ...(amount && { amount }),
          ...(dealstage && { dealstage }),
          ...(pipeline && { pipeline }),
        };
        const data = await callHubSpot('/crm/v3/objects/deals', {
          method: 'POST',
          body: JSON.stringify({ properties }),
        });
        return {
          content: [{
            type: 'text',
            text: `Deal created: ${data.id}\n${JSON.stringify(data.properties, null, 2)}`,
          }],
        };
      }

      case 'list_companies': {
        const { limit = 10 } = args;
        const data = await callHubSpot(`/crm/v3/objects/companies?limit=${limit}`);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(data.results, null, 2),
          }],
        };
      }

      case 'search_contacts': {
        const { query } = args;
        const data = await callHubSpot('/crm/v3/objects/contacts/search', {
          method: 'POST',
          body: JSON.stringify({
            filterGroups: [{
              filters: [{
                propertyName: 'email',
                operator: 'CONTAINS_TOKEN',
                value: query,
              }],
            }],
          }),
        });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(data.results, null, 2),
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
  console.error('HubSpot MCP Server running');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
