import express from 'express';
import db from '../config/database.js';
import { query } from '../config/database-sqlite-mcp.js';
import { authenticateToken } from '../middleware/auth.js';
import { getAuthenticatedClient, searchGoogleDrive, searchGmail } from '../utils/google.js';
import {
  chatCompletion,
  convertGeminiHistoryToOpenAI,
  extractTextFromResponse
} from '../utils/openrouter.js';
import { llmRouter } from '../services/llm-router.js';

const router = express.Router();

router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { conversationId, message, provider, model } = req.body;

    if (!conversationId || !message) {
      return res.status(400).json({ error: 'Conversation ID and message are required' });
    }

    const conversation = db.prepare(
      'SELECT * FROM conversations WHERE id = ? AND user_id = ?'
    ).get(conversationId, req.user.userId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    db.prepare(
      'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)'
    ).run(conversationId, 'user', message);

    let sources = [];
    let contextInfo = '';

    try {
      const integration = db.prepare(
        'SELECT * FROM integrations WHERE user_id = ? AND provider = ?'
      ).get(req.user.userId, 'google');

      if (integration) {
        const oauth2Client = await getAuthenticatedClient(req.user.userId);

        const [driveResults, gmailResults] = await Promise.all([
          searchGoogleDrive(oauth2Client, message, 3).catch(() => []),
          searchGmail(oauth2Client, message, 3).catch(() => []),
        ]);

        sources = [...driveResults, ...gmailResults];

        if (sources.length > 0) {
          contextInfo = '\n\nRelevant sources found:\n' + sources.map((s, i) =>
            `${i + 1}. ${s.title} (${s.type})`
          ).join('\n');
        }
      }
    } catch (integrationError) {
      console.log('Integration search skipped:', integrationError.message);
    }

    // Récupérer les préférences LLM de l'utilisateur
    const userPreferences = query(
      'SELECT llm_provider, llm_model, llm_settings FROM users WHERE id = ?',
      [req.user.userId]
    );

    const userProvider = provider || (userPreferences.rows[0]?.llm_provider) || llmRouter.defaultProvider;
    const userModel = model || (userPreferences.rows[0]?.llm_model) || llmRouter.defaultModel;
    const userSettings = userPreferences.rows[0]?.llm_settings
      ? JSON.parse(userPreferences.rows[0].llm_settings)
      : { temperature: 0.7, maxTokens: 2000, enableFallback: true };

    // Récupérer l'historique de la conversation
    const previousMessages = db.prepare(
      'SELECT role, content FROM messages WHERE conversation_id = ? AND id < (SELECT MAX(id) FROM messages WHERE conversation_id = ?) ORDER BY created_at ASC'
    ).all(conversationId, conversationId);

    // Convertir l'historique au format OpenAI
    const chatHistory = convertGeminiHistoryToOpenAI(
      previousMessages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }))
    );

    // Ajouter le nouveau message avec le contexte
    const messages = [
      ...chatHistory,
      {
        role: 'user',
        content: message + contextInfo
      }
    ];

    // Appeler le LLM Router avec le provider et model sélectionnés
    const result = await llmRouter.call({
      messages,
      provider: userProvider,
      model: userModel,
      temperature: userSettings.temperature,
      maxTokens: userSettings.maxTokens,
      enableFallback: userSettings.enableFallback
    });

    const response = result.content;

    const sourcesJson = sources.length > 0 ? JSON.stringify(sources) : null;

    const insertResult = db.prepare(
      'INSERT INTO messages (conversation_id, role, content, sources) VALUES (?, ?, ?, ?)'
    ).run(conversationId, 'assistant', response, sourcesJson);

    const messageId = insertResult.lastInsertRowid;

    // Track LLM usage for analytics
    try {
      query(`
        INSERT INTO llm_usage_stats (
          user_id, conversation_id, message_id, provider, model,
          input_tokens, output_tokens, total_tokens,
          input_cost, output_cost, total_cost, currency
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        req.user.userId,
        conversationId,
        messageId,
        result.provider,
        result.model,
        result.usage.inputTokens || 0,
        result.usage.outputTokens || 0,
        result.usage.totalTokens || 0,
        result.cost.input || 0,
        result.cost.output || 0,
        result.cost.total || 0,
        result.cost.currency || 'USD'
      ]);
    } catch (trackingError) {
      console.error('Failed to track LLM usage:', trackingError);
      // Don't fail the request if tracking fails
    }

    db.prepare(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(conversationId);

    const updatedMessages = db.prepare(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
    ).all(conversationId);

    res.json({
      messages: updatedMessages,
      sources: sources.length > 0 ? sources : undefined,
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message || 'Failed to process chat message' });
  }
});

export default router;
