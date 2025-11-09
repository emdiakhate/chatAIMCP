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
    // Ensure API keys are loaded from environment (in case dotenv loaded after module import)
    if (process.env.GROQ_API_KEY && !llmRouter.groqApiKey) {
      llmRouter.groqApiKey = process.env.GROQ_API_KEY;
    }
    if (process.env.OPENROUTER_API_KEY && !llmRouter.openrouterApiKey) {
      llmRouter.openrouterApiKey = process.env.OPENROUTER_API_KEY;
    }

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

/**
 * GET /api/llm/usage-stats
 * Get LLM usage statistics for the current user
 */
router.get('/usage-stats', authenticateToken, (req, res) => {
  try {
    const { period = '30d' } = req.query;

    // Calculate date range
    let dateFilter = '';
    const now = new Date();
    if (period === '24h') {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      dateFilter = `AND created_at >= '${yesterday.toISOString()}'`;
    } else if (period === '7d') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = `AND created_at >= '${weekAgo.toISOString()}'`;
    } else if (period === '30d') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFilter = `AND created_at >= '${monthAgo.toISOString()}'`;
    }

    // Overall statistics
    const overall = query(`
      SELECT
        COUNT(*) as total_requests,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        SUM(total_tokens) as total_tokens,
        SUM(total_cost) as total_cost
      FROM llm_usage_stats
      WHERE user_id = ? ${dateFilter}
    `, [req.user.userId]);

    // Statistics by provider
    const byProvider = query(`
      SELECT
        provider,
        COUNT(*) as requests,
        SUM(input_tokens) as input_tokens,
        SUM(output_tokens) as output_tokens,
        SUM(total_tokens) as total_tokens,
        SUM(total_cost) as total_cost
      FROM llm_usage_stats
      WHERE user_id = ? ${dateFilter}
      GROUP BY provider
      ORDER BY total_cost DESC
    `, [req.user.userId]);

    // Statistics by model
    const byModel = query(`
      SELECT
        provider,
        model,
        COUNT(*) as requests,
        SUM(input_tokens) as input_tokens,
        SUM(output_tokens) as output_tokens,
        SUM(total_tokens) as total_tokens,
        SUM(total_cost) as total_cost,
        AVG(total_cost) as avg_cost_per_request
      FROM llm_usage_stats
      WHERE user_id = ? ${dateFilter}
      GROUP BY provider, model
      ORDER BY total_cost DESC
    `, [req.user.userId]);

    // Daily statistics for the chart
    const daily = query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as requests,
        SUM(total_tokens) as tokens,
        SUM(total_cost) as cost
      FROM llm_usage_stats
      WHERE user_id = ? ${dateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [req.user.userId]);

    res.json({
      success: true,
      period,
      overall: overall.rows[0] || {
        total_requests: 0,
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_tokens: 0,
        total_cost: 0
      },
      byProvider: byProvider.rows || [],
      byModel: byModel.rows || [],
      daily: daily.rows || []
    });
  } catch (error) {
    console.error('Error getting LLM usage stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/llm/cost-breakdown
 * Get detailed cost breakdown
 */
router.get('/cost-breakdown', authenticateToken, (req, res) => {
  try {
    const { period = '30d' } = req.query;

    // Calculate date range
    let dateFilter = '';
    const now = new Date();
    if (period === '24h') {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      dateFilter = `AND created_at >= '${yesterday.toISOString()}'`;
    } else if (period === '7d') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = `AND created_at >= '${weekAgo.toISOString()}'`;
    } else if (period === '30d') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFilter = `AND created_at >= '${monthAgo.toISOString()}'`;
    }

    // Cost breakdown by provider and model
    const breakdown = query(`
      SELECT
        provider,
        model,
        SUM(input_cost) as input_cost,
        SUM(output_cost) as output_cost,
        SUM(total_cost) as total_cost,
        COUNT(*) as requests
      FROM llm_usage_stats
      WHERE user_id = ? ${dateFilter}
      GROUP BY provider, model
      ORDER BY total_cost DESC
    `, [req.user.userId]);

    res.json({
      success: true,
      period,
      breakdown: breakdown.rows || []
    });
  } catch (error) {
    console.error('Error getting LLM cost breakdown:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/llm/track-usage
 * Track LLM usage (internal endpoint, called by chat service)
 */
router.post('/track-usage', authenticateToken, (req, res) => {
  try {
    const {
      conversationId,
      messageId,
      provider,
      model,
      usage,
      cost
    } = req.body;

    query(`
      INSERT INTO llm_usage_stats (
        user_id, conversation_id, message_id, provider, model,
        input_tokens, output_tokens, total_tokens,
        input_cost, output_cost, total_cost, currency
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.user.userId,
      conversationId || null,
      messageId || null,
      provider,
      model,
      usage.inputTokens || 0,
      usage.outputTokens || 0,
      usage.totalTokens || 0,
      cost.input || 0,
      cost.output || 0,
      cost.total || 0,
      cost.currency || 'USD'
    ]);

    res.json({
      success: true,
      message: 'Usage tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking LLM usage:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
