# Fonctionnalités Multi-LLM & Monitoring

Ce document décrit les nouvelles fonctionnalités de sélection de modèles LLM, de monitoring des coûts et de statistiques d'utilisation implémentées dans chatAIMCP.

## Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Composants UI](#composants-ui)
3. [Backend API](#backend-api)
4. [Configuration](#configuration)
5. [Utilisation](#utilisation)

## Vue d'ensemble

Le système multi-LLM permet aux utilisateurs de :

- **Sélectionner un modèle** pour chaque message dans la zone de chat
- **Configurer un modèle par défaut** dans les paramètres
- **Monitorer les coûts** et l'utilisation en temps réel
- **Visualiser les statistiques** d'utilisation par modèle et par fournisseur

### Fournisseurs Supportés

- **Groq** : Modèles rapides et économiques (Llama 3.1 70B/8B, Mixtral, Gemma)
- **OpenRouter** : Accès unifié aux meilleurs modèles (Claude, GPT-4, Gemini, etc.)

## Composants UI

### 1. ChatInput avec Sélecteur de Modèle

**Fichier** : `src/components/claude-ui/ChatInput.tsx`

Le composant ChatInput a été amélioré avec un sélecteur de modèle intégré qui permet à l'utilisateur de choisir le modèle LLM pour chaque message.

**Fonctionnalités** :
- Dropdown avec liste de tous les modèles disponibles
- Affichage des coûts par modèle
- Groupement par fournisseur (Groq / OpenRouter)
- Sélection persistante durant la session

**Utilisation** :
```tsx
import { ChatInput } from '@/components/claude-ui';

<ChatInput
  onSend={(content, selectedModel) => {
    // content: le message
    // selectedModel: { provider: 'groq', model: 'llama-3.1-70b' }
  }}
  disabled={loading}
  placeholder="Envoyer un message..."
/>
```

### 2. LLMSettings - Configuration des Modèles

**Fichier** : `src/components/claude-ui/LLMSettings.tsx`

Modal de configuration permettant de définir le modèle par défaut et les paramètres avancés.

**Fonctionnalités** :
- Sélection du modèle par défaut
- Configuration de la température (0-1)
- Configuration du nombre maximum de tokens
- Activation/désactivation du basculement automatique (fallback)
- Indicateur de statut des fournisseurs (configuré/non configuré)

**Utilisation** :
```tsx
import { LLMSettings } from '@/components/claude-ui';

// Le composant s'affiche comme un bouton par défaut
<LLMSettings />
```

### 3. LLMDashboard - Monitoring & Statistiques

**Fichier** : `src/components/claude-ui/LLMDashboard.tsx`

Dashboard complet avec visualisation des coûts et statistiques d'utilisation.

**Fonctionnalités** :
- Vue d'ensemble (requêtes, tokens, coûts)
- Répartition par fournisseur avec graphiques
- Détails par modèle (tableau)
- Activité quotidienne
- Filtres par période (24h, 7j, 30j)

**Métriques affichées** :
- Nombre total de requêtes
- Tokens totaux utilisés
- Coût total
- Coût moyen par requête
- Répartition des coûts par fournisseur
- Utilisation par modèle

**Utilisation** :
```tsx
import { LLMDashboard } from '@/components/claude-ui';

// Le composant s'affiche comme un bouton par défaut
<LLMDashboard />
```

## Backend API

### Nouveaux Endpoints

#### 1. GET /api/llm/models
Récupère la liste des modèles disponibles.

**Réponse** :
```json
{
  "success": true,
  "models": {
    "groq": [
      {
        "id": "llama-3.1-70b",
        "provider": "groq",
        "name": "Llama 3.1 70B",
        "cost": { "input": 0.00059, "output": 0.00079 },
        "quality": "excellent",
        "useCase": "general, code, reasoning",
        "contextWindow": 131072
      }
    ],
    "openrouter": [...]
  },
  "defaultProvider": "groq",
  "defaultModel": "llama-3.1-70b",
  "configured": {
    "groq": true,
    "openrouter": false
  }
}
```

#### 2. GET /api/llm/preferences
Récupère les préférences LLM de l'utilisateur.

**Réponse** :
```json
{
  "success": true,
  "preferences": {
    "provider": "groq",
    "model": "llama-3.1-70b",
    "settings": {
      "temperature": 0.7,
      "maxTokens": 2000,
      "enableFallback": true
    }
  }
}
```

#### 3. PUT /api/llm/preferences
Met à jour les préférences LLM de l'utilisateur.

**Body** :
```json
{
  "provider": "groq",
  "model": "llama-3.1-70b",
  "settings": {
    "temperature": 0.7,
    "maxTokens": 2000,
    "enableFallback": true
  }
}
```

#### 4. GET /api/llm/usage-stats?period=30d
Récupère les statistiques d'utilisation.

**Paramètres** :
- `period` : '24h' | '7d' | '30d'

**Réponse** :
```json
{
  "success": true,
  "period": "30d",
  "overall": {
    "total_requests": 150,
    "total_input_tokens": 50000,
    "total_output_tokens": 30000,
    "total_tokens": 80000,
    "total_cost": 0.0472
  },
  "byProvider": [
    {
      "provider": "groq",
      "requests": 120,
      "total_cost": 0.0356
    }
  ],
  "byModel": [
    {
      "provider": "groq",
      "model": "llama-3.1-70b",
      "requests": 100,
      "total_cost": 0.0298,
      "avg_cost_per_request": 0.000298
    }
  ],
  "daily": [
    {
      "date": "2025-01-01",
      "requests": 15,
      "tokens": 8000,
      "cost": 0.0047
    }
  ]
}
```

#### 5. GET /api/llm/cost-breakdown?period=30d
Récupère la répartition détaillée des coûts.

#### 6. POST /api/llm/test
Teste un modèle LLM.

**Body** :
```json
{
  "provider": "groq",
  "model": "llama-3.1-70b",
  "message": "Hello!"
}
```

### Base de Données

#### Nouvelle Table : llm_usage_stats

```sql
CREATE TABLE llm_usage_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  conversation_id INTEGER,
  message_id INTEGER,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  input_cost REAL DEFAULT 0,
  output_cost REAL DEFAULT 0,
  total_cost REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);
```

#### Colonnes Ajoutées à users

```sql
ALTER TABLE users ADD COLUMN llm_provider TEXT DEFAULT 'groq';
ALTER TABLE users ADD COLUMN llm_model TEXT DEFAULT 'llama-3.1-70b';
ALTER TABLE users ADD COLUMN llm_settings TEXT DEFAULT '{}';
```

## Configuration

### Variables d'Environnement

Ajoutez ces variables dans votre fichier `.env` :

```bash
# API Keys pour les fournisseurs LLM
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-v1-...

# Configuration par défaut (optionnel)
DEFAULT_LLM_PROVIDER=groq
DEFAULT_LLM_MODEL=llama-3.1-70b
```

### Configuration du LLM Router

Le router LLM est configuré dans `backend/src/services/llm-router.js` :

```javascript
import { LLMRouter } from './llm-router.js';

export const llmRouter = new LLMRouter({
  groqApiKey: process.env.GROQ_API_KEY,
  openrouterApiKey: process.env.OPENROUTER_API_KEY,
  defaultProvider: 'groq',
  defaultModel: 'llama-3.1-70b'
});
```

## Utilisation

### Flux Utilisateur

1. **Configuration initiale** :
   - L'utilisateur ouvre le menu Settings LLM
   - Configure ses API keys (Groq et/ou OpenRouter)
   - Sélectionne un modèle par défaut
   - Ajuste les paramètres avancés (température, tokens, fallback)

2. **Utilisation au quotidien** :
   - L'utilisateur ouvre une conversation
   - Pour chaque message, il peut :
     - Utiliser le modèle par défaut (pas de sélection)
     - Choisir un modèle spécifique via le sélecteur
   - Le système tracke automatiquement l'utilisation et les coûts

3. **Monitoring** :
   - L'utilisateur ouvre le dashboard LLM
   - Consulte ses statistiques d'utilisation
   - Analyse la répartition des coûts
   - Optimise son utilisation en fonction des besoins

### Exemple d'Intégration

```tsx
import React from 'react';
import { ChatArea } from '@/components/claude-ui/ChatArea';
import { LLMSettings } from '@/components/claude-ui/LLMSettings';
import { LLMDashboard } from '@/components/claude-ui/LLMDashboard';

function App() {
  return (
    <div className="app">
      <header>
        <LLMSettings />
        <LLMDashboard />
      </header>
      <main>
        <ChatArea conversationId={currentConversationId} />
      </main>
    </div>
  );
}
```

## Tarification des Modèles

### Groq (Ultra-rapide, Low Cost)

| Modèle | Entrée ($/1M tokens) | Sortie ($/1M tokens) | Cas d'usage |
|--------|---------------------|---------------------|-------------|
| Llama 3.1 70B | $0.59 | $0.79 | Général, code, raisonnement |
| Llama 3.1 8B | $0.05 | $0.08 | Tâches simples, rapide |
| Mixtral 8x7B | $0.24 | $0.24 | Général, multilingue |
| Gemma 7B | $0.07 | $0.07 | Tâches simples, low cost |

### OpenRouter (Premium, Multi-Provider)

| Modèle | Entrée ($/1M tokens) | Sortie ($/1M tokens) | Cas d'usage |
|--------|---------------------|---------------------|-------------|
| Claude 3.5 Sonnet | $3.00 | $15.00 | Raisonnement complexe, code |
| Claude 3.5 Haiku | $0.80 | $4.00 | Réponses rapides |
| GPT-4o | $2.50 | $10.00 | Général, vision |
| GPT-4o Mini | $0.15 | $0.60 | Low cost, rapide |
| Gemini Pro 1.5 | $1.25 | $5.00 | Grand contexte, multimodal |
| Gemini Flash 1.5 | $0.075 | $0.30 | Rapide, low cost |

## Optimisation des Coûts

### Recommandations

1. **Pour les tâches simples** : Utilisez Llama 3.1 8B ou Gemini Flash
2. **Pour le code** : Llama 3.1 70B offre un excellent rapport qualité/prix
3. **Pour le raisonnement complexe** : Claude 3.5 Sonnet via OpenRouter
4. **Pour les longs contextes** : Gemini Pro 1.5 (2M tokens de contexte)

### Monitoring

- Consultez régulièrement le dashboard pour identifier les modèles les plus coûteux
- Ajustez vos préférences en fonction de vos besoins réels
- Activez le fallback pour garantir la disponibilité sans surcoût

## Support & Contribution

Pour toute question ou suggestion d'amélioration, veuillez ouvrir une issue sur le repository GitHub.

---

**Dernière mise à jour** : 2025-11-08
**Version** : 1.0.0
