import express from 'express';
import db, { query } from '../config/database-sqlite-mcp.js';
import { authenticateToken } from '../middleware/auth.js';
import mcpClientManager from '../mcp/client-manager.js';
import { getApiKey } from './auth-apikey.js';
import multer from 'multer';
import {
  chatCompletionStream,
  convertGeminiHistoryToOpenAI,
  extractToolCallsFromResponse,
  prepareToolResponseMessages
} from '../utils/openrouter.js';

const router = express.Router();

// Configuration multer pour upload de fichiers
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
});

/**
 * POST /api/chat/stream
 * Endpoint de chat avec streaming SSE
 */
router.post('/stream', authenticateToken, async (req, res) => {
  try {
    const { conversationId, message } = req.body;

    if (!conversationId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Conversation ID and message are required'
      });
    }

    // Vérifier que la conversation appartient à l'utilisateur
    const conversationResult = query(
      'SELECT * FROM conversations WHERE id = ? AND user_id = ?',
      [conversationId, req.user.userId]
    );

    if (conversationResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    // Configurer SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Fonction helper pour envoyer des événements SSE
    const sendSSE = (event, data) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // Enregistrer le message utilisateur
      const userMessageResult = query(
        'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?) RETURNING id',
        [conversationId, 'user', message]
      );
      const userMessageId = userMessageResult.lastInsertRowid;

      sendSSE('user_message', { id: userMessageId, content: message });

      // Récupérer l'historique de la conversation
      const messagesResult = query(
        'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
        [conversationId]
      );

      // Convertir au format OpenAI
      const history = messagesResult.rows.map((msg) => ({
        role: msg.role,
        content: msg.content
      }));

      // Récupérer les outils MCP actifs
      const connectionsResult = query(`
        SELECT c.*, s.*
        FROM user_mcp_connections c
        JOIN mcp_servers s ON c.server_id = s.id
        WHERE c.user_id = ? AND c.status = 'active'
      `, [req.user.userId]);

      const activeConnections = connectionsResult.rows;
      let availableTools = [];

      // Préparer les outils MCP
      for (const connection of activeConnections) {
        try {
          const serverArgs = connection.args ? JSON.parse(connection.args) : [];
          const serverConfig = {
            id: connection.server_id,
            name: connection.name,
            transport_type: connection.transport_type,
            command: connection.command,
            args: serverArgs,
            env: connection.env ? JSON.parse(connection.env) : {},
            url: connection.url
          };

          const tools = await mcpClientManager.listTools(
            req.user.userId,
            connection.server_id,
            serverConfig
          );

          const formattedTools = tools.map(tool => ({
            type: 'function',
            function: {
              name: `${connection.server_key}__${tool.name}`,
              description: tool.description || `Tool from ${connection.name}`,
              parameters: tool.inputSchema || {}
            }
          }));

          availableTools = availableTools.concat(formattedTools);
        } catch (error) {
          console.error(`Error loading tools for ${connection.name}:`, error);
        }
      }

      sendSSE('tools_loaded', { count: availableTools.length });

      // Streamer la réponse
      let fullResponse = '';
      const apiKey = process.env.OPENROUTER_API_KEY;
      const model = process.env.OPENROUTER_MODEL || 'google/gemini-flash-1.5-8b';

      await chatCompletionStream(
        apiKey,
        history,
        {
          model,
          temperature: 0.7,
          max_tokens: 2048,
          tools: availableTools.length > 0 ? availableTools : null
        },
        (chunk) => {
          fullResponse += chunk;
          sendSSE('token', { content: chunk });
        }
      );

      // Enregistrer la réponse de l'assistant
      const assistantMessageResult = query(
        'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?) RETURNING id',
        [conversationId, 'assistant', fullResponse]
      );

      sendSSE('complete', {
        id: assistantMessageResult.lastInsertRowid,
        content: fullResponse
      });

      // Mettre à jour le titre si c'est la première réponse
      const messageCount = query(
        'SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?',
        [conversationId]
      );

      if (messageCount.rows[0].count <= 2) {
        // Générer un titre basé sur le premier message
        const title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
        query(
          'UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [title, conversationId]
        );
      }

      res.end();
    } catch (error) {
      console.error('Error in chat stream:', error);
      sendSSE('error', { message: error.message || 'Failed to process chat' });
      res.end();
    }
  } catch (error) {
    console.error('Error setting up chat stream:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to start chat stream'
      });
    }
  }
});

/**
 * POST /api/speech-to-text
 * Transcrit un fichier audio en texte avec OpenAI Whisper
 */
router.post('/speech-to-text', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Audio file is required'
      });
    }

    // Récupérer la clé API OpenAI de l'utilisateur
    const openaiApiKey = getApiKey(req.user.userId, 'openai');

    if (!openaiApiKey) {
      return res.status(400).json({
        success: false,
        error: 'OpenAI API key not configured. Please add it in MCP Tools settings.'
      });
    }

    // Appeler l'API Whisper d'OpenAI
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname || 'audio.webm',
      contentType: req.file.mimetype
    });
    formData.append('model', 'whisper-1');
    if (req.body.language) {
      formData.append('language', req.body.language); // 'fr' ou 'en'
    }

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Whisper API error');
    }

    const data = await response.json();

    res.json({
      success: true,
      text: data.text
    });
  } catch (error) {
    console.error('Error in speech-to-text:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to transcribe audio'
    });
  }
});

/**
 * POST /api/upload-file
 * Upload un fichier pour traitement
 */
router.post('/upload-file', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'File is required'
      });
    }

    const { conversationId } = req.body;

    // Pour l'instant, on retourne juste les infos du fichier
    // Dans une version plus avancée, on pourrait:
    // - Sauvegarder le fichier temporairement
    // - Extraire le texte si c'est un PDF, Word, etc.
    // - Associer le fichier à la conversation

    res.json({
      success: true,
      file: {
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
        preview: req.file.buffer.toString('utf-8', 0, Math.min(500, req.file.size))
      },
      message: `File "${req.file.originalname}" uploaded successfully. You can now reference it in your chat.`
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload file'
    });
  }
});

export default router;
