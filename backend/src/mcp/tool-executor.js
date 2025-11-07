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
   * Parse les données de fichier depuis un résultat de lecture de fichier
   * @param {Object} result - Résultat MCP du tool read_file
   * @param {Object} args - Arguments du tool call (contient path)
   * @returns {Object|null} - Données structurées du fichier ou null
   */
  parseFileData(result, args) {
    try {
      // Vérifier que c'est bien un résultat de lecture de fichier
      if (!result || !result.content || !Array.isArray(result.content)) {
        return null;
      }

      const textContent = result.content[0]?.text;
      if (!textContent) return null;

      // Parser le format de sortie du serveur filesystem
      // Format: "File: xxx\nType: xxx\nSize: xxx\n...\n\n--- Content ---\n\n[content]"
      const lines = textContent.split('\n');
      const metadata = {};
      let contentStartIndex = -1;

      // Extraire les métadonnées
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line === '--- Content ---') {
          contentStartIndex = i + 2; // Skip "--- Content ---" and empty line
          break;
        }

        if (line.includes(':')) {
          const [key, ...valueParts] = line.split(':');
          const value = valueParts.join(':').trim();

          const normalizedKey = key.trim().toLowerCase();
          if (normalizedKey === 'file') metadata.fileName = value;
          else if (normalizedKey === 'type') metadata.fileType = value;
          else if (normalizedKey === 'size') metadata.size = value;
          else if (normalizedKey === 'modified') metadata.modified = value;
          else if (normalizedKey === 'pages') metadata.pages = parseInt(value);
          else if (normalizedKey === 'sheets') {
            // Format: "3 (Sheet1, Sheet2, Sheet3)"
            const match = value.match(/(\d+)\s*\(([^)]+)\)/);
            if (match) {
              metadata.sheetCount = parseInt(match[1]);
              metadata.sheetNames = match[2].split(',').map(s => s.trim());
            }
          }
          else if (normalizedKey === 'lines') metadata.lines = parseInt(value);
        }
      }

      // Extraire le contenu
      const content = contentStartIndex >= 0
        ? lines.slice(contentStartIndex).join('\n')
        : textContent;

      // Construire l'objet fileData compatible avec FilePreview
      return {
        fileName: metadata.fileName || args.path?.split('/').pop() || 'unknown',
        fileType: metadata.fileType || 'text',
        content: content,
        metadata: {
          size: metadata.size,
          pages: metadata.pages,
          sheetCount: metadata.sheetCount,
          sheetNames: metadata.sheetNames,
          lines: metadata.lines,
          modified: metadata.modified
        },
        downloadUrl: args.path // Le chemin original peut servir de download URL
      };

    } catch (error) {
      console.error('[ToolExecutor] Erreur lors du parsing des données de fichier:', error);
      return null;
    }
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

      // Détecter si c'est une lecture de fichier et extraire les données structurées
      let fileData = null;
      if (toolName === 'read_file' && result && result.content) {
        fileData = this.parseFileData(result, args);
        if (fileData) {
          console.log(`[ToolExecutor] Données de fichier extraites: ${fileData.fileName} (${fileData.fileType})`);
        }
      }

      // Enregistrer l'exécution dans l'historique
      const execution = {
        userId,
        serverId,
        conversationId,
        toolName,
        args,
        result,
        fileData, // Ajouter fileData à l'historique
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
        fileData, // Inclure fileData dans le retour
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
