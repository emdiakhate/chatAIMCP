import express from 'express';
import db from '../config/database-sqlite-mcp.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/conversations', authenticateToken, (req, res) => {
  try {
    const { title } = req.body;
    const conversationTitle = title || 'Nouvelle Conversation';

    const result = db.prepare(
      'INSERT INTO conversations (user_id, title) VALUES (?, ?)'
    ).run(req.user.userId, conversationTitle);

    const conversation = db.prepare(
      'SELECT * FROM conversations WHERE id = ?'
    ).get(result.lastInsertRowid);

    res.status(201).json({ conversation });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

router.get('/conversations', authenticateToken, (req, res) => {
  try {
    const conversations = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count,
        (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at ASC LIMIT 1) as first_message
      FROM conversations c
      WHERE c.user_id = ?
      ORDER BY c.updated_at DESC
    `).all(req.user.userId);

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

router.get('/conversations/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    const conversation = db.prepare(
      'SELECT * FROM conversations WHERE id = ? AND user_id = ?'
    ).get(id, req.user.userId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = db.prepare(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
    ).all(id);

    res.json({ conversation, messages });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

router.put('/conversations/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    console.log(`[Update Conversation] ID: ${id}, Title: ${title}, User: ${req.user.userId}`);

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required' });
    }

    const result = db.prepare(
      'UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?'
    ).run(title.trim(), id, req.user.userId);

    console.log(`[Update Conversation] Changes: ${result.changes}`);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const conversation = db.prepare(
      'SELECT * FROM conversations WHERE id = ?'
    ).get(id);

    console.log(`[Update Conversation] Success: ${conversation.title}`);

    res.json({ conversation });
  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({ error: 'Failed to update conversation', details: error.message });
  }
});

router.delete('/conversations/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    const result = db.prepare(
      'DELETE FROM conversations WHERE id = ? AND user_id = ?'
    ).run(id, req.user.userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

export default router;
