import express from 'express';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { getAuthenticatedClient, searchGoogleDrive, searchGmail } from '../utils/google.js';
import {
  chatCompletion,
  convertGeminiHistoryToOpenAI,
  extractTextFromResponse
} from '../utils/openrouter.js';

const router = express.Router();

router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { conversationId, message } = req.body;

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

    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

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

    // Appeler OpenRouter
    const result = await chatCompletion(
      process.env.OPENROUTER_API_KEY,
      messages,
      {
        model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-pro',
        temperature: 0.7,
        max_tokens: 2048
      }
    );

    const response = extractTextFromResponse(result);

    const sourcesJson = sources.length > 0 ? JSON.stringify(sources) : null;

    db.prepare(
      'INSERT INTO messages (conversation_id, role, content, sources) VALUES (?, ?, ?, ?)'
    ).run(conversationId, 'assistant', response, sourcesJson);

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
