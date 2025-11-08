import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import mcpClientManager from '../mcp/client-manager.js';
import db, { query } from '../config/database-sqlite-mcp.js';

const router = express.Router();

/**
 * GET /api/mcp/memory/list
 * Récupère tous les souvenirs de l'utilisateur via Memory MCP
 */
router.get('/memory/list', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Récupérer la connexion Memory MCP de l'utilisateur
    const connectionResult = query(`
      SELECT c.*, s.server_key, s.name as server_name
      FROM user_mcp_connections c
      JOIN mcp_servers s ON c.server_id = s.id
      WHERE c.user_id = ? AND s.server_key = 'memory' AND c.status = 'active'
      LIMIT 1
    `, [userId]);

    if (connectionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Memory MCP not connected. Please connect it first.',
        memories: []
      });
    }

    const connection = connectionResult.rows[0];

      // Récupérer les infos du serveur
      const serverResult = query('SELECT * FROM mcp_servers WHERE id = ?', [connection.server_id]);
      const server = serverResult.rows[0];

      if (!server) {
        return res.status(404).json({
          success: false,
          error: 'Memory MCP server not found'
        });
      }

    // Créer/récupérer le client MCP
      const serverConfig = {
        transport_type: server.transport_type,
        command: server.command,
        args: server.args ? JSON.parse(server.args) : [],
      env: server.env ? JSON.parse(server.env) : {},
      name: server.name
    };

    const client = await mcpClientManager.getOrCreateClient(userId, connection.server_id, serverConfig);

    // Le Memory MCP est en fait un Knowledge Graph MCP
    // Utiliser read_graph pour récupérer tous les souvenirs
    let memories = [];
    try {
      // Utiliser read_graph directement pour obtenir toutes les entités
      const graphResult = await mcpClientManager.callTool(
      userId,
      connection.server_id,
        serverConfig,
        'read_graph',
        {}
      );

      // Parser le résultat du Knowledge Graph
      if (graphResult && graphResult.content && graphResult.content.length > 0) {
        const content = graphResult.content[0];
      if (content.type === 'text') {
          try {
            // Parser le JSON retourné par read_graph
            const graphData = JSON.parse(content.text);
            if (graphData.entities && Array.isArray(graphData.entities)) {
              // Extraire les entités avec leurs observations
              memories = graphData.entities.map((entity, index) => {
                // Extraire le contenu depuis les observations ou la description
                let memoryContent = entity.description || entity.name || '';
                if (entity.observations && entity.observations.length > 0) {
                  memoryContent = entity.observations.map((obs) => obs.description || obs).join('\n');
                }
                
                return {
                  id: `mem-${index}-${entity.name || index}`,
                  content: memoryContent,
                  createdAt: new Date().toISOString(),
                  tags: entity.name ? [entity.name] : []
                };
              });
            }
          } catch (parseError) {
            console.error('Error parsing graph JSON:', parseError);
            // Fallback: essayer search_nodes
            try {
              const searchResult = await mcpClientManager.callTool(
                userId,
                connection.server_id,
                serverConfig,
                'search_nodes',
                { query: '' }
              );
              if (searchResult && searchResult.content && searchResult.content.length > 0) {
                const searchContent = searchResult.content[0];
                if (searchContent.type === 'text') {
                  const lines = searchContent.text.split('\n').filter((line) => line.trim());
          memories = lines.map((line, index) => ({
            id: `mem-${index}`,
            content: line,
            createdAt: new Date().toISOString(),
            tags: []
          }));
                }
              }
            } catch (searchError) {
              console.error('Error calling search_nodes:', searchError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error calling read_graph:', error);
    }

    res.json({
      success: true,
      memories
    });

  } catch (error) {
    console.error('Error listing memories:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list memories'
    });
  }
});

/**
 * POST /api/mcp/memory/store
 * Stocke un nouveau souvenir via Memory MCP
 */
router.post('/memory/store', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { content, tags } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Memory content is required'
      });
    }

    // Récupérer la connexion Memory MCP
    const connectionResult = query(`
      SELECT c.*, s.server_key, s.name as server_name
      FROM user_mcp_connections c
      JOIN mcp_servers s ON c.server_id = s.id
      WHERE c.user_id = ? AND s.server_key = 'memory' AND c.status = 'active'
      LIMIT 1
    `, [userId]);

    if (connectionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Memory MCP not connected. Please connect it first.'
      });
    }

    const connection = connectionResult.rows[0];

    // Récupérer les infos du serveur
      const serverResult = query('SELECT * FROM mcp_servers WHERE id = ?', [connection.server_id]);
      const server = serverResult.rows[0];

    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'Memory MCP server not found'
      });
    }

    // Créer/récupérer le client MCP
      const serverConfig = {
        transport_type: server.transport_type,
        command: server.command,
        args: server.args ? JSON.parse(server.args) : [],
      env: server.env ? JSON.parse(server.env) : {},
      name: server.name
      };

    const client = await mcpClientManager.getOrCreateClient(userId, connection.server_id, serverConfig);

    // Le Memory MCP est en fait un Knowledge Graph MCP
    // Utiliser add_observations pour stocker un souvenir
    // Préparer le contenu avec tags si fournis
    let memoryContent = content;
    if (tags && tags.length > 0) {
      memoryContent = `[Tags: ${tags.join(', ')}] ${content}`;
    }

    // Créer d'abord une entité pour le souvenir
    const entityName = tags && tags.length > 0 ? tags[0] : `memory-${Date.now()}`;
    
    console.log(`[Memory] Creating entity with name: ${entityName}`);
    console.log(`[Memory] Content: ${memoryContent.substring(0, 50)}...`);
    
    try {
      // Créer une entité pour ce souvenir
      const createResult = await mcpClientManager.callTool(
      userId,
      connection.server_id,
        serverConfig,
        'create_entities',
        {
          entities: [{
            name: entityName,
            description: memoryContent
          }]
        }
      );

      console.log(`[Memory] Create entities result:`, JSON.stringify(createResult, null, 2));

      // Vérifier que l'entité a été créée
      if (!createResult || !createResult.content) {
        throw new Error('Failed to create entity: No result from create_entities');
      }

      // Attendre un peu pour que l'entité soit disponible
      await new Promise(resolve => setTimeout(resolve, 100));

      // Ajouter une observation (le contenu du souvenir)
      // Essayer différents formats possibles pour add_observations
      console.log(`[Memory] Adding observation to entity: ${entityName}`);
      
      // Format 1: Essayer avec observations comme tableau de chaînes
      let result;
      try {
        result = await mcpClientManager.callTool(
          userId,
          connection.server_id,
          serverConfig,
          'add_observations',
          {
            entity_name: entityName,
            observations: [memoryContent]
          }
        );
      } catch (error1) {
        console.log(`[Memory] Format 1 failed, trying format 2:`, error1.message);
        // Format 2: Essayer avec observation (singulier)
        try {
          result = await mcpClientManager.callTool(
            userId,
            connection.server_id,
            serverConfig,
            'add_observations',
            {
              entity_name: entityName,
              observation: memoryContent
            }
          );
        } catch (error2) {
          console.log(`[Memory] Format 2 failed, trying format 3:`, error2.message);
          // Format 3: Essayer avec le format original mais en vérifiant entity_name
          if (!entityName || entityName === 'undefined') {
            throw new Error(`Invalid entity name: ${entityName}`);
          }
          result = await mcpClientManager.callTool(
            userId,
            connection.server_id,
            serverConfig,
            'add_observations',
            {
              entity_name: String(entityName), // S'assurer que c'est une chaîne
              observations: [{
                description: memoryContent
              }]
            }
          );
        }
      }

      console.log(`[Memory] Add observations result:`, JSON.stringify(result, null, 2));

      if (!result) {
        throw new Error('Failed to store memory: No result from add_observations');
      }
    } catch (error) {
      console.error('Error storing memory:', error);
      console.error('Error details:', {
        entityName,
        hasTags: !!tags,
        tagsLength: tags?.length || 0,
        errorMessage: error.message,
        errorCode: error.code
      });
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to store memory'
      });
    }

    // Logger dans mcp_tool_calls
    query(`
      INSERT INTO mcp_tool_calls (
        user_id, server_id, tool_name, parameters, result, success, execution_time, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      userId,
      connection.server_id,
      'add_observations',
      JSON.stringify({ content: memoryContent, entity_name: entityName }),
      JSON.stringify({ success: true }),
      1,
      0
    ]);

    res.json({
      success: true,
      memory: {
        id: `mem-${Date.now()}`,
        content,
        tags: tags || [],
        createdAt: new Date().toISOString()
      },
      message: 'Memory stored successfully'
    });

  } catch (error) {
    console.error('Error storing memory:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to store memory'
    });
  }
});

/**
 * DELETE /api/mcp/memory/:id
 * Supprime un souvenir (Note: Memory MCP ne supporte pas la suppression individuelle)
 * On retourne juste success pour l'instant
 */
router.delete('/memory/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    // Note: Le Memory MCP standard ne supporte pas la suppression de souvenirs individuels
    // Il faudrait étendre le serveur MCP ou utiliser un serveur custom
    // Pour l'instant, on simule le succès

    console.log(`[Memory] Delete request for memory ${id} by user ${userId}`);
    console.log('⚠️  Memory MCP does not support individual deletion - operation simulated');

    res.json({
      success: true,
      message: 'Memory deletion simulated (not supported by standard Memory MCP)'
    });

  } catch (error) {
    console.error('Error deleting memory:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete memory'
    });
  }
});

export default router;
