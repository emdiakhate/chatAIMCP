import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { llmRouter, PROVIDERS } from '../services/llm-router.js';
import { query } from '../config/database-sqlite-mcp.js';

const router = express.Router();

/**
 * GET /api/llm/models
 * Get available LLM models for the current user
 */
router.get('/models', authenticateToken, (req, res) => {
  try {
    const models = llmRouter.getAvailableModels();

    // Group by provider
    const groupedModels = {
      groq: models.filter(m => m.provider === PROVIDERS.GROQ),
      openrouter: models.filter(m => m.provider === PROVIDERS.OPENROUTER)
    };

    res.json({
      success: true,
      models: groupedModels,
      defaultProvider: llmRouter.defaultProvider,
      defaultModel: llmRouter.defaultModel,
      configured: {
        groq: !!llmRouter.groqApiKey,
        openrouter: !!llmRouter.openrouterApiKey
      }
    });
  } catch (error) {
    console.error('Error getting LLM models:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/llm/preferences
 * Get user's LLM preferences
 */
router.get('/preferences', authenticateToken, (req, res) => {
  try {
    const result = query(
      'SELECT llm_provider, llm_model, llm_settings FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      preferences: {
        provider: user.llm_provider || llmRouter.defaultProvider,
        model: user.llm_model || llmRouter.defaultModel,
        settings: user.llm_settings ? JSON.parse(user.llm_settings) : {
          temperature: 0.7,
          maxTokens: 2000,
          enableFallback: true
        }
      }
    });
  } catch (error) {
    console.error('Error getting LLM preferences:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/llm/preferences
 * Update user's LLM preferences
 */
router.put('/preferences', authenticateToken, (req, res) => {
  try {
    const { provider, model, settings } = req.body;

    // Validate provider and model
    const availableModels = llmRouter.getAvailableModels();
    const selectedModel = availableModels.find(m => m.id === model && m.provider === provider);

    if (!selectedModel) {
      return res.status(400).json({
        success: false,
        error: 'Invalid model or provider'
      });
    }

    // Update user preferences
    query(
      'UPDATE users SET llm_provider = ?, llm_model = ?, llm_settings = ? WHERE id = ?',
      [provider, model, JSON.stringify(settings || {}), req.user.userId]
    );

    res.json({
      success: true,
      preferences: {
        provider,
        model,
        settings
      }
    });
  } catch (error) {
    console.error('Error updating LLM preferences:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/llm/test
 * Test a specific LLM model
 */
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const { provider, model, message = 'Hello! Please respond with "OK" if you can hear me.' } = req.body;

    const messages = [
      { role: 'user', content: message }
    ];

    const result = await llmRouter.call({
      messages,
      provider,
      model,
      maxTokens: 100,
      enableFallback: false
    });

    res.json({
      success: true,
      response: result.content,
      model: result.model,
      provider: result.provider,
      usage: result.usage,
      cost: result.cost
    });
  } catch (error) {
    console.error('Error testing LLM:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
