const API_BASE_URL = 'http://localhost:3001/api';

class ApiClient {
  private getAuthHeader(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async signup(email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Signup failed');
    }

    return response.json();
  }

  async login(email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    return response.json();
  }

  async getMe() {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to get user');
    }

    return response.json();
  }

  async getConversations() {
    const response = await fetch(`${API_BASE_URL}/conversations`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to get conversations');
    }

    return response.json();
  }

  async createConversation(title?: string) {
    const response = await fetch(`${API_BASE_URL}/conversations`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      throw new Error('Failed to create conversation');
    }

    return response.json();
  }

  async getConversation(id: number) {
    const response = await fetch(`${API_BASE_URL}/conversations/${id}`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to get conversation');
    }

    return response.json();
  }

  async deleteConversation(id: number) {
    const response = await fetch(`${API_BASE_URL}/conversations/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete conversation');
    }

    return response.json();
  }

  async sendMessage(conversationId: number, message: string) {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify({ conversationId, message }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send message');
    }

    return response.json();
  }

  async getGoogleAuthUrl() {
    const response = await fetch(`${API_BASE_URL}/google/auth-url`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to get auth URL');
    }

    return response.json();
  }

  async getIntegrations() {
    const response = await fetch(`${API_BASE_URL}/integrations`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to get integrations');
    }

    return response.json();
  }

  async deleteIntegration(provider: string) {
    const response = await fetch(`${API_BASE_URL}/integrations/${provider}`, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete integration');
    }

    return response.json();
  }

  // === MCP SERVERS ===

  async getMCPServers(category?: string, search?: string) {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);

    const url = `${API_BASE_URL}/mcp/servers${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to get MCP servers');
    }

    return response.json();
  }

  async getMCPServer(id: number) {
    const response = await fetch(`${API_BASE_URL}/mcp/servers/${id}`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to get MCP server');
    }

    return response.json();
  }

  async createMCPServer(serverData: any) {
    const response = await fetch(`${API_BASE_URL}/mcp/servers`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify(serverData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create MCP server');
    }

    return response.json();
  }

  async updateMCPServer(id: number, serverData: any) {
    const response = await fetch(`${API_BASE_URL}/mcp/servers/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeader(),
      body: JSON.stringify(serverData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update MCP server');
    }

    return response.json();
  }

  async deleteMCPServer(id: number) {
    const response = await fetch(`${API_BASE_URL}/mcp/servers/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete MCP server');
    }

    return response.json();
  }

  async getMCPCategories() {
    const response = await fetch(`${API_BASE_URL}/mcp/categories`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to get MCP categories');
    }

    return response.json();
  }

  // === MCP CONNECTIONS ===

  async getMCPConnections() {
    const response = await fetch(`${API_BASE_URL}/mcp/connections`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to get MCP connections');
    }

    return response.json();
  }

  async createMCPConnection(serverId: number, credentials?: any, configOverrides?: any) {
    const response = await fetch(`${API_BASE_URL}/mcp/connections`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify({
        server_id: serverId,
        credentials,
        config_overrides: configOverrides,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create MCP connection');
    }

    return response.json();
  }

  async deleteMCPConnection(id: number) {
    const response = await fetch(`${API_BASE_URL}/mcp/connections/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete MCP connection');
    }

    return response.json();
  }

  async testMCPConnection(id: number) {
    const response = await fetch(`${API_BASE_URL}/mcp/connections/${id}/test`, {
      method: 'POST',
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Connection test failed');
    }

    return response.json();
  }

  async getMCPConnectionTools(id: number) {
    const response = await fetch(`${API_BASE_URL}/mcp/connections/${id}/tools`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to get connection tools');
    }

    return response.json();
  }

  async executeMCPTool(connectionId: number, toolName: string, args?: any, conversationId?: number) {
    const response = await fetch(`${API_BASE_URL}/mcp/tools/execute`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify({
        connection_id: connectionId,
        tool_name: toolName,
        arguments: args,
        conversation_id: conversationId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to execute tool');
    }

    return response.json();
  }

  async getMCPStats() {
    const response = await fetch(`${API_BASE_URL}/mcp/stats`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to get MCP stats');
    }

    return response.json();
  }

  async getAvailableTools() {
    const response = await fetch(`${API_BASE_URL}/chat/available-tools`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to get available tools');
    }

    return response.json();
  }
}

export const api = new ApiClient();
