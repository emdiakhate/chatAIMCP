import mcpClientManager from './client-manager.js';

/**
 * ToolExecutor - Gère l'exécution des appels d'outils MCP
 *
 * Ce module fait le pont entre les demandes de tool calling du LLM
 * et l'exécution réelle via les clients MCP.
 */
class ToolExecutor {
  constructor() {
    this.executionHistory = new Map(); // userId -> Array of executions
  }

  /**
   * Exécute un appel d'outil MCP
   * @param {number} userId - ID de l'utilisateur
   * @param {number} serverId - ID du serveur MCP
   * @param {Object} serverConfig - Configuration du serveur
   * @param {string} toolName - Nom de l'outil
   * @param {Object} args - Arguments de l'outil
   * @param {number} conversationId - ID de la conversation
   * @returns {Promise<Object>} - Résultat de l'exécution
   */
  async executeTool(userId, serverId, serverConfig, toolName, args, conversationId = null) {
    const startTime = Date.now();

    try {
      console.log(`[ToolExecutor] Exécution: ${toolName} pour user ${userId}`);

      // Appeler l'outil via le client manager
      const result = await mcpClientManager.callTool(
        userId,
        serverId,
        serverConfig,
        toolName,
        args
      );

      const executionTime = Date.now() - startTime;

      // Enregistrer l'exécution dans l'historique
      const execution = {
        userId,
        serverId,
        conversationId,
        toolName,
        args,
        result,
        executionTime,
        timestamp: new Date().toISOString(),
        success: true
      };

      this.addToHistory(userId, execution);

      console.log(`[ToolExecutor] Succès: ${toolName} (${executionTime}ms)`);

      return {
        success: true,
        toolName,
        result,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;

      console.error(`[ToolExecutor] Erreur: ${toolName}`, error);

      // Enregistrer l'erreur dans l'historique
      const execution = {
        userId,
        serverId,
        conversationId,
        toolName,
        args,
        error: error.message,
        executionTime,
        timestamp: new Date().toISOString(),
        success: false
      };

      this.addToHistory(userId, execution);

      return {
        success: false,
        toolName,
        error: error.message,
        executionTime
      };
    }
  }

  /**
   * Exécute plusieurs outils en parallèle
   * @param {number} userId - ID de l'utilisateur
   * @param {Array} toolCalls - Liste des appels d'outils
   * @param {number} conversationId - ID de la conversation
   * @returns {Promise<Array>} - Résultats des exécutions
   */
  async executeMultipleTools(userId, toolCalls, conversationId = null) {
    console.log(`[ToolExecutor] Exécution parallèle de ${toolCalls.length} outils`);

    const results = await Promise.allSettled(
      toolCalls.map(({ serverId, serverConfig, toolName, args }) =>
        this.executeTool(userId, serverId, serverConfig, toolName, args, conversationId)
      )
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          toolName: toolCalls[index].toolName,
          error: result.reason.message
        };
      }
    });
  }

  /**
   * Formate les outils MCP pour le LLM
   * @param {Array} tools - Liste des outils MCP
   * @param {string} serverId - ID du serveur source
   * @returns {Array} - Outils formatés pour le LLM
   */
  formatToolsForLLM(tools, serverId) {
    return tools.map(tool => ({
      name: `${serverId}_${tool.name}`,
      description: tool.description,
      input_schema: tool.inputSchema,
      serverId,
      originalName: tool.name
    }));
  }

  /**
   * Parse un nom d'outil composé (serverId_toolName)
   * @param {string} composedName - Nom composé
   * @returns {Object} - { serverId, toolName }
   */
  parseToolName(composedName) {
    const parts = composedName.split('_');
    if (parts.length < 2) {
      throw new Error(`Format de nom d'outil invalide: ${composedName}`);
    }

    const serverId = parts[0];
    const toolName = parts.slice(1).join('_');

    return { serverId, toolName };
  }

  /**
   * Récupère tous les outils disponibles pour un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @param {Array} activeConnections - Connexions MCP actives de l'utilisateur
   * @returns {Promise<Array>} - Liste de tous les outils disponibles
   */
  async getAllAvailableTools(userId, activeConnections) {
    const allTools = [];

    for (const connection of activeConnections) {
      try {
        const tools = await mcpClientManager.listTools(
          userId,
          connection.server_id,
          connection.serverConfig
        );

        const formattedTools = this.formatToolsForLLM(tools, connection.server_id);
        allTools.push(...formattedTools);

      } catch (error) {
        console.error(`Erreur lors de la récupération des outils pour le serveur ${connection.server_id}:`, error);
      }
    }

    return allTools;
  }

  /**
   * Ajoute une exécution à l'historique
   * @param {number} userId - ID de l'utilisateur
   * @param {Object} execution - Détails de l'exécution
   */
  addToHistory(userId, execution) {
    if (!this.executionHistory.has(userId)) {
      this.executionHistory.set(userId, []);
    }

    const history = this.executionHistory.get(userId);
    history.push(execution);

    // Garder seulement les 100 dernières exécutions
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Récupère l'historique d'exécution d'un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @param {number} limit - Nombre max d'entrées
   * @returns {Array} - Historique d'exécution
   */
  getHistory(userId, limit = 50) {
    const history = this.executionHistory.get(userId) || [];
    return history.slice(-limit);
  }

  /**
   * Récupère les statistiques d'utilisation des outils
   * @param {number} userId - ID de l'utilisateur
   * @returns {Object} - Statistiques
   */
  getStats(userId) {
    const history = this.executionHistory.get(userId) || [];

    const toolUsage = {};
    let totalExecutions = 0;
    let successfulExecutions = 0;
    let totalExecutionTime = 0;

    history.forEach(execution => {
      totalExecutions++;

      if (execution.success) {
        successfulExecutions++;
      }

      totalExecutionTime += execution.executionTime;

      if (!toolUsage[execution.toolName]) {
        toolUsage[execution.toolName] = {
          count: 0,
          successCount: 0,
          totalTime: 0
        };
      }

      toolUsage[execution.toolName].count++;
      if (execution.success) {
        toolUsage[execution.toolName].successCount++;
      }
      toolUsage[execution.toolName].totalTime += execution.executionTime;
    });

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions: totalExecutions - successfulExecutions,
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions * 100).toFixed(2) + '%' : '0%',
      averageExecutionTime: totalExecutions > 0 ? Math.round(totalExecutionTime / totalExecutions) : 0,
      toolUsage: Object.entries(toolUsage).map(([name, stats]) => ({
        toolName: name,
        count: stats.count,
        successRate: ((stats.successCount / stats.count) * 100).toFixed(2) + '%',
        avgTime: Math.round(stats.totalTime / stats.count)
      })).sort((a, b) => b.count - a.count)
    };
  }

  /**
   * Nettoie l'historique d'un utilisateur
   * @param {number} userId - ID de l'utilisateur
   */
  clearHistory(userId) {
    this.executionHistory.delete(userId);
  }
}

// Instance singleton
const toolExecutor = new ToolExecutor();

export default toolExecutor;
