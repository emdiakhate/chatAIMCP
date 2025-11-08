# Multi-LLM Configuration Guide

ChatAI MCP supporte maintenant plusieurs fournisseurs LLM pour optimiser les coûts et la performance.

## 🎯 Fournisseurs Supportés

### 1. **Groq** (Recommandé - Gratuit/Très bas coût)
- **Llama 3.1 70B**: $0.59/M tokens - Excellent pour code, raisonnement
- **Llama 3.1 8B**: $0.05/M tokens - Ultra-rapide pour tâches simples
- **Mixtral 8x7B**: $0.24/M tokens - Multilingue, excellent
- **Gemma 7B**: $0.07/M tokens - Tâches simples, très économique

**Avantages**:
- ⚡ Ultra-rapide (inférence optimisée)
- 💰 Coût le plus bas (~95% moins cher que GPT-4)
- 🆓 Gratuit pour usage modéré

**Obtenir une clé API**:
1. Aller sur https://console.groq.com/
2. Créer un compte gratuit
3. Générer une clé API
4. Ajouter dans `.env`: `GROQ_API_KEY=gsk_...`

### 2. **OpenRouter** (Accès Multi-Modèles)
- **Claude 3.5 Sonnet**: $3/M tokens - Meilleur raisonnement complexe
- **Gemini Pro 1.5**: $1.25/M tokens - Grand contexte (2M tokens)
- **Gemini Flash 1.5**: $0.075/M tokens - Rapide et économique
- **GPT-4o**: $2.50/M tokens - Vision, général
- **GPT-4o Mini**: $0.15/M tokens - Rapide, économique
- **Llama 3.1 405B**: $2.70/M tokens - Plus puissant open-source

**Avantages**:
- 🎯 Accès à 100+ modèles via une seule API
- 💰 Prix compétitifs (généralement 50% moins cher que direct)
- 🔄 Fallback automatique si un modèle est indisponible

**Obtenir une clé API**:
1. Aller sur https://openrouter.ai/
2. Créer un compte (gratuit, $5 de crédit offerts)
3. Générer une clé API
4. Ajouter dans `.env`: `OPENROUTER_API_KEY=sk-or-...`

## 📋 Configuration

### 1. Fichier `.env`

```bash
# LLM Providers (choisir au moins un)
GROQ_API_KEY=gsk_your_groq_key_here
OPENROUTER_API_KEY=sk-or-your_openrouter_key_here

# Optionnel: Fallback vers OpenRouter legacy
OPENROUTER_MODEL=google/gemini-flash-1.5
```

### 2. Configuration par Défaut

Le système utilise automatiquement:
- **Provider**: Groq (si configuré)
- **Modèle**: Llama 3.1 70B
- **Temperature**: 0.7
- **Max Tokens**: 2000

### 3. Préférences Utilisateur

Chaque utilisateur peut configurer ses préférences via:
- L'interface UI (à venir)
- L'API REST

**API Endpoints**:

```bash
# Get available models
GET /api/llm/models

# Get user preferences
GET /api/llm/preferences

# Update user preferences
PUT /api/llm/preferences
{
  "provider": "groq",
  "model": "llama-3.1-70b",
  "settings": {
    "temperature": 0.7,
    "maxTokens": 2000,
    "enableFallback": true
  }
}

# Test a model
POST /api/llm/test
{
  "provider": "groq",
  "model": "llama-3.1-70b",
  "message": "Hello! Can you respond?"
}
```

## 💰 Comparaison des Coûts

### Scénario: 100 utilisateurs, 50k messages/mois

| Provider | Modèle | Coût/M tokens | Coût mensuel estimé |
|----------|--------|---------------|---------------------|
| **Groq** | Llama 3.1 70B | $0.59 | **$30-50** ⭐ |
| **OpenRouter** | Gemini Flash | $0.075 | **$40-60** |
| **OpenRouter** | Claude Sonnet | $3.00 | $150-300 |
| **Direct** | GPT-4o | $5.00 | $500-800 |
| **Direct** | Claude Opus | $15.00 | $1,500-3,000 |

**Économies avec Groq**: 90-95% par rapport aux modèles premium

## 🎨 Stratégie de Routing (À venir)

Le système supporte le routing intelligent par type de tâche:

```javascript
// Tâches simples → Llama 8B (ultra-rapide, $0.05/M)
simple_qa, translation, summarization

// Code → Llama 70B (excellent, $0.59/M)
code_generation, code_review, debugging

// Raisonnement complexe → Claude Sonnet ($3/M)
complex_reasoning, analysis, research

// Grand contexte → Gemini Pro ($1.25/M)
large_documents, multi-document_analysis
```

## 🔧 Troubleshooting

### Erreur: "No LLM provider configured"

**Solution**: Ajoutez au moins une clé API dans `.env`:
```bash
GROQ_API_KEY=gsk_...
# OU
OPENROUTER_API_KEY=sk-or-...
```

### Les réponses sont lentes

**Solution**: Utilisez Groq (le plus rapide):
```bash
PUT /api/llm/preferences
{
  "provider": "groq",
  "model": "llama-3.1-8b"  # Encore plus rapide
}
```

### Coûts trop élevés

**Solution**: Passez à Groq Llama 70B:
- Même qualité que GPT-4 pour la plupart des tâches
- 95% moins cher
- 10x plus rapide

## 📊 Monitoring des Coûts

Chaque requête retourne les informations de coût:

```json
{
  "content": "Réponse...",
  "usage": {
    "inputTokens": 150,
    "outputTokens": 200,
    "totalTokens": 350
  },
  "cost": {
    "input": 0.0000885,
    "output": 0.000158,
    "total": 0.0002465,
    "currency": "USD"
  }
}
```

## 🚀 Prochaines Étapes

1. ✅ Support Groq et OpenRouter
2. ✅ Sélection de modèle par utilisateur
3. ⏳ Interface UI pour configuration
4. ⏳ Routing automatique par type de tâche
5. ⏳ Dashboard de monitoring des coûts
6. ⏳ Cache sémantique pour économiser
7. ⏳ Fine-tuning Llama pour cas spécifiques

## 📖 Ressources

- [Documentation Groq](https://console.groq.com/docs)
- [Documentation OpenRouter](https://openrouter.ai/docs)
- [Tarifs Groq](https://wow.groq.com/pricing/)
- [Tarifs OpenRouter](https://openrouter.ai/docs#models)
