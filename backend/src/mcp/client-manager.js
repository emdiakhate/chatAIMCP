import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

/**
 * MCPClientManager - Gère les clients MCP pour chaque utilisateur
 *
 * Ce gestionnaire maintient un pool de connexions actives aux serveurs MCP
 * et permet d'exécuter des outils, récupérer des ressources et gérer les prompts.
 */
class MCPClientManager {
  constructor() {
    // Map: userId -> Map(serverId -> Client)
    this.userClients = new Map();

    // Map: clientId -> { client, metadata }
    this.activeClients = new Map();

    // Timeout pour les connexions inactives (30 minutes)
    this.IDLE_TIMEOUT = 30 * 60 * 1000;
  }

  /**
   * Crée un nouveau client MCP pour un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @param {number} serverId - ID du serveur MCP
   * @param {Object} serverConfig - Configuration du serveur
   * @returns {Promise<Client>} - Client MCP initialisé
   */
  async createClient(userId, serverId, serverConfig) {
    try {
      const clientId = `${userId}-${serverId}`;

      // Vérifier si un client existe déjà
      if (this.activeClients.has(clientId)) {
        console.log(`Réutilisation du client existant pour ${clientId}`);
        return this.activeClients.get(clientId).client;
      }

      // Créer le transport approprié
      let transport;
      if (serverConfig.transport_type === 'stdio') {
        transport = new StdioClientTransport({
          command: serverConfig.command,
          args: serverConfig.args || [],
          env: { ...process.env, ...serverConfig.env }
        });
      } else if (serverConfig.transport_type === 'sse') {
        transport = new SSEClientTransport(
          new URL(serverConfig.url)
        );
      } else {
        throw new Error(`Type de transport non supporté: ${serverConfig.transport_type}`);
      }

      // Créer et connecter le client
      const client = new Client({
        name: `chatAIMCP-${userId}`,
        version: '1.0.0'
      }, {
        capabilities: {
          roots: {
            listChanged: true
          },
          sampling: {}
        }
      });

      await client.connect(transport);

      // Stocker le client avec metadata
      this.activeClients.set(clientId, {
        client,
        userId,
        serverId,
        connectedAt: Date.now(),
        lastUsedAt: Date.now()
      });

      // Ajouter à la map utilisateur
      if (!this.userClients.has(userId)) {
        this.userClients.set(userId, new Map());
      }
      this.userClients.get(userId).set(serverId, client);

      console.log(`Client MCP créé: ${clientId} (${serverConfig.name})`);

      // Lister les outils disponibles
      const tools = await client.listTools();
      console.log(`Outils disponibles pour ${serverConfig.name}:`, tools.tools.map(t => t.name));

      return client;
    } catch (error) {
      console.error(`Erreur lors de la création du client MCP:`, error);
      throw error;
    }
  }

  /**
   * Récupère un client existant ou en crée un nouveau
   * @param {number} userId - ID de l'utilisateur
   * @param {number} serverId - ID du serveur MCP
   * @param {Object} serverConfig - Configuration du serveur
   * @returns {Promise<Client>} - Client MCP
   */
  async getOrCreateClient(userId, serverId, serverConfig) {
    const clientId = `${userId}-${serverId}`;

    if (this.activeClients.has(clientId)) {
      const clientData = this.activeClients.get(clientId);
      clientData.lastUsedAt = Date.now();
      return clientData.client;
    }

    return await this.createClient(userId, serverId, serverConfig);
  }

  /**
   * Déconnecte un client MCP spécifique
   * @param {number} userId - ID de l'utilisateur
   * @param {number} serverId - ID du serveur MCP
   */
  async disconnectClient(userId, serverId) {
    const clientId = `${userId}-${serverId}`;

    if (this.activeClients.has(clientId)) {
      const { client } = this.activeClients.get(clientId);

      try {
        await client.close();
        console.log(`Client MCP déconnecté: ${clientId}`);
      } catch (error) {
        console.error(`Erreur lors de la déconnexion du client ${clientId}:`, error);
      }

      this.activeClients.delete(clientId);

      if (this.userClients.has(userId)) {
        this.userClients.get(userId).delete(serverId);

        if (this.userClients.get(userId).size === 0) {
          this.userClients.delete(userId);
        }
      }
    }
  }

  /**
   * Déconnecte tous les clients d'un utilisateur
   * @param {number} userId - ID de l'utilisateur
   */
  async disconnectAllUserClients(userId) {
    if (!this.userClients.has(userId)) return;

    const serverIds = Array.from(this.userClients.get(userId).keys());

    await Promise.all(
      serverIds.map(serverId => this.disconnectClient(userId, serverId))
    );
  }

  /**
   * Liste tous les outils disponibles pour un client
   * @param {number} userId - ID de l'utilisateur
   * @param {number} serverId - ID du serveur MCP
   * @returns {Promise<Array>} - Liste des outils
   */
  async listTools(userId, serverId, serverConfig) {
    const client = await this.getOrCreateClient(userId, serverId, serverConfig);
    const result = await client.listTools();
    return result.tools;
  }

  /**
   * Exécute un outil MCP
   * @param {number} userId - ID de l'utilisateur
   * @param {number} serverId - ID du serveur MCP
   * @param {Object} serverConfig - Configuration du serveur
   * @param {string} toolName - Nom de l'outil
   * @param {Object} args - Arguments de l'outil
   * @returns {Promise<Object>} - Résultat de l'exécution
   */
  async callTool(userId, serverId, serverConfig, toolName, args) {
    try {
      const client = await this.getOrCreateClient(userId, serverId, serverConfig);

      console.log(`Appel de l'outil ${toolName} sur le serveur ${serverId} pour l'utilisateur ${userId}`);

      const result = await client.callTool({
        name: toolName,
        arguments: args
      });

      return result;
    } catch (error) {
      console.error(`Erreur lors de l'appel de l'outil ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * Liste les ressources disponibles pour un client
   * @param {number} userId - ID de l'utilisateur
   * @param {number} serverId - ID du serveur MCP
   * @param {Object} serverConfig - Configuration du serveur
   * @returns {Promise<Array>} - Liste des ressources
   */
  async listResources(userId, serverId, serverConfig) {
    const client = await this.getOrCreateClient(userId, serverId, serverConfig);
    const result = await client.listResources();
    return result.resources;
  }

  /**
   * Lit une ressource spécifique
   * @param {number} userId - ID de l'utilisateur
   * @param {number} serverId - ID du serveur MCP
   * @param {Object} serverConfig - Configuration du serveur
   * @param {string} uri - URI de la ressource
   * @returns {Promise<Object>} - Contenu de la ressource
   */
  async readResource(userId, serverId, serverConfig, uri) {
    const client = await this.getOrCreateClient(userId, serverId, serverConfig);
    const result = await client.readResource({ uri });
    return result;
  }

  /**
   * Liste les prompts disponibles
   * @param {number} userId - ID de l'utilisateur
   * @param {number} serverId - ID du serveur MCP
   * @param {Object} serverConfig - Configuration du serveur
   * @returns {Promise<Array>} - Liste des prompts
   */
  async listPrompts(userId, serverId, serverConfig) {
    const client = await this.getOrCreateClient(userId, serverId, serverConfig);
    const result = await client.listPrompts();
    return result.prompts;
  }

  /**
   * Récupère un prompt spécifique
   * @param {number} userId - ID de l'utilisateur
   * @param {number} serverId - ID du serveur MCP
   * @param {Object} serverConfig - Configuration du serveur
   * @param {string} name - Nom du prompt
   * @param {Object} args - Arguments du prompt
   * @returns {Promise<Object>} - Prompt complet
   */
  async getPrompt(userId, serverId, serverConfig, name, args) {
    const client = await this.getOrCreateClient(userId, serverId, serverConfig);
    const result = await client.getPrompt({ name, arguments: args });
    return result;
  }

  /**
   * Nettoie les connexions inactives
   */
  cleanupIdleConnections() {
    const now = Date.now();
    const toDisconnect = [];

    for (const [clientId, clientData] of this.activeClients.entries()) {
      if (now - clientData.lastUsedAt > this.IDLE_TIMEOUT) {
        toDisconnect.push(clientId);
      }
    }

    toDisconnect.forEach(clientId => {
      const [userId, serverId] = clientId.split('-').map(Number);
      this.disconnectClient(userId, serverId);
      console.log(`Client inactif nettoyé: ${clientId}`);
    });
  }

  /**
   * Récupère les statistiques des clients actifs
   * @returns {Object} - Statistiques
   */
  getStats() {
    return {
      totalActiveClients: this.activeClients.size,
      totalUsers: this.userClients.size,
      clientsByUser: Array.from(this.userClients.entries()).map(([userId, clients]) => ({
        userId,
        clientCount: clients.size
      }))
    };
  }
}

// Instance singleton
const mcpClientManager = new MCPClientManager();

// Nettoyer les connexions inactives toutes les 10 minutes
setInterval(() => {
  mcpClientManager.cleanupIdleConnections();
}, 10 * 60 * 1000);

export default mcpClientManager;
