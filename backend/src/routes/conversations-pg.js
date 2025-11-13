import express from 'express';
import { query } from '../config/database-pg.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/conversations', authenticateToken, async (req, res) => {
  try {
    const { title } = req.body;
    const conversationTitle = title || 'Nouvelle Conversation';

    const result = await query(
      'INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING *',
      [req.user.userId, conversationTitle]
    );

    const conversation = result.rows[0];

    res.status(201).json({ conversation });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    // Obtenir le nombre total de conversations
    const totalResult = await query(
      'SELECT COUNT(*) as total FROM conversations WHERE user_id = $1',
      [req.user.userId]
    );
    const total = parseInt(totalResult.rows[0].total);

    // Obtenir les conversations avec pagination
    const result = await query(`
      SELECT c.*,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count,
        (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at ASC LIMIT 1) as first_message
      FROM conversations c
      WHERE c.user_id = $1
      ORDER BY c.updated_at DESC
      LIMIT $2 OFFSET $3
    `, [req.user.userId, limit, offset]);

    const conversations = result.rows;

    res.json({
      conversations,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + conversations.length < total
      }
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

router.get('/conversations/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const convResult = await query(
      'SELECT * FROM conversations WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );

    const conversation = convResult.rows[0];

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messagesResult = await query(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [id]
    );

    const messages = messagesResult.rows;

    res.json({ conversation, messages });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

router.delete('/conversations/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM conversations WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

export default router;
