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

    const data = await response.json();
    // L'API retourne { conversations: [...] }, on extrait le tableau
    return data.conversations || [];
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

    const data = await response.json();
    // L'API retourne { conversation: {...} }, on extrait l'objet
    return data.conversation || data;
  }

  async getConversation(id: number) {
    const response = await fetch(`${API_BASE_URL}/conversations/${id}`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to get conversation');
    }

    const data = await response.json();
    // L'API retourne { conversation: {...}, messages: [...] }
    return {
      conversation: data.conversation || data,
      messages: data.messages || []
    };
  }

  async getMessages(conversationId: number) {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      // Fallback to getConversation and extract messages
      const { messages } = await this.getConversation(conversationId);
      return messages;
    }

    return response.json();
  }

  async updateConversation(id: number, title: string) {
    const response = await fetch(`${API_BASE_URL}/conversations/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeader(),
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to update conversation';
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.conversation || data;
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

  /**
   * Envoie un message avec streaming SSE
   * @param conversationId - ID de la conversation
   * @param message - Message à envoyer
   * @param onToken - Callback appelé pour chaque token reçu
   * @param onComplete - Callback appelé quand le streaming est terminé
   * @param onError - Callback appelé en cas d'erreur
   * @param onUserMessage - Callback optionnel appelé quand le message utilisateur est enregistré (avec l'ID réel)
   */
  sendMessageStream(
    conversationId: number,
    message: string,
    onToken: (content: string) => void,
    onComplete: (fullContent: string, messageId: number) => void,
    onError: (error: Error) => void,
    onUserMessage?: (messageId: number) => void
  ) {
    const token = localStorage.getItem('token');
    if (!token) {
      onError(new Error('No authentication token found'));
      return;
    }

    // Créer une requête POST avec le body
    fetch(`${API_BASE_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ conversationId, message }),
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((error) => {
            throw new Error(error.error || 'Failed to start stream');
          });
        }

        // Lire le stream SSE
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';
        let messageId: number | null = null;
        let currentEventType: string | null = null;

        if (!reader) {
          throw new Error('No response body');
        }


        const processStream = (): Promise<void> => {
          return reader.read().then(({ done, value }) => {
            if (done) {
              if (messageId !== null && fullContent) {
                onComplete(fullContent, messageId);
              }
              return;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim() === '') {
                // Ligne vide = fin d'un événement SSE, réinitialiser le type
                currentEventType = null;
                continue;
              }

              if (line.startsWith('event: ')) {
                currentEventType = line.slice(7).trim();
                continue;
              }

              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);
                  
                  if (currentEventType === 'user_message' && parsed.id) {
                    // Événement 'user_message' - message utilisateur enregistré
                    if (onUserMessage) {
                      onUserMessage(parsed.id);
                    }
                  } else if (currentEventType === 'token' && parsed.content) {
                    // Événement 'token'
                    fullContent += parsed.content;
                    onToken(parsed.content);
                  } else if (currentEventType === 'complete') {
                    // Événement 'complete'
                    if (parsed.id) {
                      messageId = parsed.id;
                    }
                    if (parsed.content) {
                      fullContent = parsed.content;
                    }
                  } else if (currentEventType === 'error' || parsed.message) {
                    // Événement 'error'
                    throw new Error(parsed.message || 'Stream error');
                  } else if (parsed.content && !currentEventType) {
                    // Fallback: si pas d'event type mais content présent, traiter comme token
                    fullContent += parsed.content;
                    onToken(parsed.content);
                  }
                } catch (e) {
                  // Ignorer les erreurs de parsing pour les lignes vides
                  if (data.trim()) {
                    console.warn('[SSE] Failed to parse SSE data:', data, e);
                  }
                }
              }
            }

            return processStream();
          });
        };

        return processStream();
      })
      .catch((error) => {
        console.error('[SSE] Stream error:', error);
        onError(error instanceof Error ? error : new Error(String(error)));
      });
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
    const headers = this.getAuthHeader();
    const token = localStorage.getItem('token');
    
    // Debug: vérifier que le token existe
    if (!token) {
      throw new Error('No authentication token found. Please log in again.');
    }

    const response = await fetch(`${API_BASE_URL}/mcp/connections`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        server_id: serverId,
        credentials,
        config_overrides: configOverrides,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `Failed to create MCP connection (${response.status})`);
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

  // === MEMORY MCP ===

  async getMCPMemories() {
    // This should call the Memory MCP server to retrieve all memories
    const response = await fetch(`${API_BASE_URL}/mcp/memory/list`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to get memories');
    }

    return response.json();
  }

  async createMCPMemory(memoryData: { content: string; tags?: string[] }) {
    // This should call the Memory MCP server to store a new memory
    const response = await fetch(`${API_BASE_URL}/mcp/memory/store`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify(memoryData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create memory');
    }

    return response.json();
  }

  async deleteMCPMemory(memoryId: string) {
    // This should call the Memory MCP server to delete a memory
    const response = await fetch(`${API_BASE_URL}/mcp/memory/${memoryId}`, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete memory');
    }

    return response.json();
  }

  async updateMCPConnectionConfig(connectionId: number, configOverrides: any) {
    const response = await fetch(`${API_BASE_URL}/mcp/connections/${connectionId}/config`, {
      method: 'PATCH',
      headers: this.getAuthHeader(),
      body: JSON.stringify({ config_overrides: configOverrides }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update connection config');
    }

    return response.json();
  }

  async configureApiKey(provider: string, apiKey: string) {
    const response = await fetch(`${API_BASE_URL}/auth/apikey/${provider}`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify({ api_key: apiKey }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to configure API key');
    }

    return response.json();
  }

  // === LLM METHODS ===

  async getLLMModels() {
    const response = await fetch(`${API_BASE_URL}/llm/models`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to get LLM models');
    }

    return response.json();
  }

  async getLLMPreferences() {
    const response = await fetch(`${API_BASE_URL}/llm/preferences`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to get LLM preferences');
    }

    return response.json();
  }

  async updateLLMPreferences(provider: string, model: string, settings?: any) {
    const response = await fetch(`${API_BASE_URL}/llm/preferences`, {
      method: 'PUT',
      headers: this.getAuthHeader(),
      body: JSON.stringify({ provider, model, settings }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update LLM preferences');
    }

    return response.json();
  }

  async testLLMModel(provider: string, model: string, message?: string) {
    const response = await fetch(`${API_BASE_URL}/llm/test`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify({ provider, model, message }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to test LLM model');
    }

    return response.json();
  }

  async getLLMUsageStats(period: '24h' | '7d' | '30d' = '30d') {
    const response = await fetch(`${API_BASE_URL}/llm/usage-stats?period=${period}`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to get LLM usage stats');
    }

    return response.json();
  }

  async getLLMCostBreakdown(period: '24h' | '7d' | '30d' = '30d') {
    const response = await fetch(`${API_BASE_URL}/llm/cost-breakdown?period=${period}`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to get LLM cost breakdown');
    }

    return response.json();
  }

  async trackLLMUsage(data: {
    conversationId?: number;
    messageId?: number;
    provider: string;
    model: string;
    usage: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
    cost: {
      input: number;
      output: number;
      total: number;
      currency?: string;
    };
  }) {
    const response = await fetch(`${API_BASE_URL}/llm/track-usage`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to track LLM usage');
    }

    return response.json();
  }
}

export const api = new ApiClient();
