# 🚀 ChatAI MCP - Documentation Technique

## Vue d'ensemble

ChatAI MCP est une plateforme de chat IA avec support du **Model Context Protocol (MCP)**, permettant aux entreprises de connecter leurs outils (Gmail, Outlook, Drive, bases de données, etc.) directement dans les conversations IA.

## 🎯 Objectifs du Projet

- ✅ Clone de Claude.ai avec interface de chat moderne
- ✅ Support du Model Context Protocol (MCP)
- ✅ Gestion des connexions d'outils par utilisateur
- ✅ Architecture multi-tenant pour entreprises
- ✅ Tool calling automatique via le LLM
- ✅ Interface de gestion des serveurs MCP

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│  - Interface Chat                                           │
│  - Panneau de gestion MCP                                   │
│  - Configuration des connexions                             │
└──────────────────┬─────────────────────────────────────────┘
                   │ HTTP/REST API
┌──────────────────▼─────────────────────────────────────────┐
│              Backend API (Express + Node.js)                │
│                                                              │
│  ┌────────────────────────────────────────────────────┐   │
│  │         MCP Client Manager                          │   │
│  │  - Gestion des connexions par utilisateur          │   │
│  │  - Pool de clients MCP actifs                      │   │
│  │  - Cleanup automatique des connexions inactives    │   │
│  └────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌────────────────────────────────────────────────────┐   │
│  │         Tool Executor                               │   │
│  │  - Exécution des appels d'outils                   │   │
│  │  - Historique et statistiques                      │   │
│  │  - Gestion des erreurs                             │   │
│  └────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌────────────────────────────────────────────────────┐   │
│  │         Server Registry                             │   │
│  │  - Catalogue des serveurs MCP disponibles          │   │
│  │  - Serveurs pré-configurés                         │   │
│  │  - Serveurs personnalisés par entreprise           │   │
│  └────────────────────────────────────────────────────┘   │
└──────────────────┬─────────────────────────────────────────┘
                   │
       ┌───────────┼───────────┬────────────────┐
       │           │           │                 │
┌──────▼──────┐ ┌─▼─────────┐ ┌▼──────────┐ ┌──▼──────────┐
│   MCP       │ │   LLM      │ │PostgreSQL │ │   OAuth2    │
│  Servers    │ │  (Gemini)  │ │ Database  │ │  Providers  │
│             │ │            │ │           │ │             │
│ • Gmail     │ └────────────┘ └───────────┘ │ • Google    │
│ • Drive     │                               │ • Microsoft │
│ • Outlook   │                               │ • GitHub    │
│ • GitHub    │                               │ • Slack     │
│ • Notion    │                               └─────────────┘
│ • Slack     │
│ • Custom... │
└─────────────┘
```

## 📁 Structure du Projet

```
chatAIMCP/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js           # SQLite (ancienne version)
│   │   │   └── database-pg.js        # PostgreSQL (nouvelle version)
│   │   │
│   │   ├── mcp/
│   │   │   ├── client-manager.js     # Gestionnaire de clients MCP
│   │   │   ├── server-registry.js    # Catalogue de serveurs MCP
│   │   │   └── tool-executor.js      # Exécuteur d'outils MCP
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.js               # Authentification
│   │   │   ├── chat.js               # Chat (ancienne version)
│   │   │   ├── chat-mcp.js           # Chat avec MCP
│   │   │   ├── conversations.js      # Gestion des conversations
│   │   │   ├── mcp-servers.js        # API serveurs MCP
│   │   │   ├── mcp-connections.js    # API connexions MCP
│   │   │   └── integrations.js       # Intégrations OAuth
│   │   │
│   │   ├── middleware/
│   │   │   └── auth.js               # JWT middleware
│   │   │
│   │   ├── server.js                 # Serveur (ancienne version)
│   │   └── server-mcp.js             # Serveur avec MCP
│   │
│   ├── .env.example
│   └── package.json
│
├── src/                                # Frontend React
│   ├── components/
│   ├── pages/
│   └── lib/
│
└── README-MCP.md                       # Cette documentation
```

## 🗄️ Schéma de Base de Données

### Tables Existantes

```sql
users
├── id (SERIAL PRIMARY KEY)
├── email (VARCHAR UNIQUE)
├── password (VARCHAR)
└── created_at (TIMESTAMP)

conversations
├── id (SERIAL PRIMARY KEY)
├── user_id (FK → users)
├── title (TEXT)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

messages
├── id (SERIAL PRIMARY KEY)
├── conversation_id (FK → conversations)
├── role (VARCHAR: 'user' | 'assistant')
├── content (TEXT)
├── sources (JSONB)
└── created_at (TIMESTAMP)
```

### Nouvelles Tables MCP

```sql
mcp_servers
├── id (SERIAL PRIMARY KEY)
├── server_key (VARCHAR UNIQUE)
├── name (VARCHAR)
├── description (TEXT)
├── transport_type (VARCHAR: 'stdio' | 'sse')
├── command (TEXT)
├── args (JSONB)
├── env (JSONB)
├── url (TEXT)
├── icon (VARCHAR)
├── category (VARCHAR)
├── is_public (BOOLEAN)
├── requires_auth (BOOLEAN)
├── auth_type (VARCHAR)
├── auth_provider (VARCHAR)
├── scopes (JSONB)
├── capabilities (JSONB)
├── is_custom (BOOLEAN)
└── created_at (TIMESTAMP)

user_mcp_connections
├── id (SERIAL PRIMARY KEY)
├── user_id (FK → users)
├── server_id (FK → mcp_servers)
├── status (VARCHAR: 'active' | 'disconnected' | 'error')
├── credentials (JSONB)              # Tokens OAuth, API keys
├── config_overrides (JSONB)
├── last_connected (TIMESTAMP)
└── created_at (TIMESTAMP)

mcp_tool_calls
├── id (SERIAL PRIMARY KEY)
├── user_id (FK → users)
├── conversation_id (FK → conversations)
├── server_id (FK → mcp_servers)
├── tool_name (VARCHAR)
├── parameters (JSONB)
├── result (JSONB)
├── error_message (TEXT)
├── execution_time (INTEGER)        # En millisecondes
├── success (BOOLEAN)
└── created_at (TIMESTAMP)

organizations                        # Pour multi-tenancy
├── id (SERIAL PRIMARY KEY)
├── name (VARCHAR)
├── slug (VARCHAR UNIQUE)
├── plan (VARCHAR)
├── max_users (INTEGER)
└── created_at (TIMESTAMP)
```

## 🔌 API Endpoints

### Authentication

```
POST   /api/auth/signup              # Créer un compte
POST   /api/auth/login               # Se connecter
GET    /api/auth/me                  # Profil utilisateur
```

### Chat

```
POST   /api/chat                     # Envoyer un message (avec MCP)
GET    /api/chat/available-tools     # Lister les outils disponibles
```

### Conversations

```
GET    /api/conversations            # Lister les conversations
POST   /api/conversations            # Créer une conversation
GET    /api/conversations/:id        # Récupérer une conversation
DELETE /api/conversations/:id        # Supprimer une conversation
```

### MCP Servers

```
GET    /api/mcp/servers              # Lister les serveurs MCP
GET    /api/mcp/servers/:id          # Détails d'un serveur
POST   /api/mcp/servers              # Créer un serveur personnalisé
PUT    /api/mcp/servers/:id          # Modifier un serveur
DELETE /api/mcp/servers/:id          # Supprimer un serveur
GET    /api/mcp/categories           # Catégories de serveurs
```

### MCP Connections

```
GET    /api/mcp/connections          # Lister les connexions actives
POST   /api/mcp/connections          # Créer une connexion
DELETE /api/mcp/connections/:id      # Supprimer une connexion
POST   /api/mcp/connections/:id/test # Tester une connexion
GET    /api/mcp/connections/:id/tools # Lister les outils d'une connexion
```

### Tool Execution

```
POST   /api/mcp/tools/execute        # Exécuter un outil manuellement
GET    /api/mcp/stats                # Statistiques d'utilisation
```

## 🚀 Installation

### Prérequis

- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

### 1. Cloner le projet

```bash
git clone <your-repo-url>
cd chatAIMCP
```

### 2. Installer les dépendances

```bash
# Frontend
npm install

# Backend
cd backend
npm install
```

### 3. Configurer PostgreSQL

```bash
# Créer la base de données
createdb chataimcp

# Ou via psql
psql -U postgres
CREATE DATABASE chataimcp;
```

### 4. Configuration environnement

```bash
cd backend
cp .env.example .env

# Éditer .env avec vos valeurs
nano .env
```

**Variables essentielles :**

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chataimcp
DB_USER=postgres
DB_PASSWORD=your-password

JWT_SECRET=your-secret-key
GEMINI_API_KEY=your-gemini-api-key

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 5. Démarrer l'application

```bash
# Terminal 1 : Backend
cd backend
npm run dev        # ou: node src/server-mcp.js

# Terminal 2 : Frontend
npm run dev
```

L'application sera disponible sur :
- Frontend : http://localhost:5173
- Backend : http://localhost:3001
- Health check : http://localhost:3001/health

## 🔧 Utilisation

### 1. Créer un compte

Accédez à http://localhost:5173 et créez un compte.

### 2. Connecter des outils MCP

1. Cliquez sur le panneau "Mes Outils" (à implémenter dans le frontend)
2. Parcourez les serveurs MCP disponibles
3. Sélectionnez un serveur (ex: Gmail)
4. Suivez le flux OAuth pour connecter votre compte
5. Le serveur sera actif et ses outils disponibles dans le chat

### 3. Utiliser les outils dans le chat

Créez une conversation et posez des questions comme :

```
"Trouve-moi les emails de la semaine dernière concernant le projet X"
"Cherche dans mon Drive le fichier budget 2024"
"Crée un issue GitHub pour corriger ce bug"
```

Le LLM appellera automatiquement les outils MCP appropriés.

## 🛠️ Ajouter un Serveur MCP Personnalisé

### Méthode 1 : Via l'API

```bash
curl -X POST http://localhost:3001/api/mcp/servers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "server_key": "my-custom-server",
    "name": "My Custom Server",
    "description": "Accès à mon API personnalisée",
    "transport_type": "stdio",
    "command": "node",
    "args": ["./mcp-servers/custom/index.js"],
    "icon": "🔧",
    "category": "utility",
    "requires_auth": false,
    "capabilities": ["search", "fetch", "create"]
  }'
```

### Méthode 2 : Via le Frontend

Interface à développer dans la Phase 2.

## 📊 Statistiques et Monitoring

### Voir les statistiques d'utilisation

```bash
curl http://localhost:3001/api/mcp/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Réponse :

```json
{
  "success": true,
  "stats": {
    "totalCalls": 150,
    "successfulCalls": 145,
    "successRate": "96.67%",
    "avgExecutionTime": 234
  },
  "topTools": [
    {
      "name": "search_emails",
      "count": 45,
      "avgTime": 189
    }
  ]
}
```

## 🔒 Sécurité

### Authentification

- JWT avec expiration de 7 jours
- Refresh tokens (à implémenter)
- Passwords hashés avec bcrypt (10 salt rounds)

### OAuth2

- Tokens stockés chiffrés dans la DB (à implémenter)
- Support PKCE pour OAuth flows
- Scopes minimaux par défaut

### MCP Security

- Connexions isolées par utilisateur
- Timeout automatique après 30 min d'inactivité
- Validation des inputs des outils
- Rate limiting (à implémenter)

## 🧪 Tests

```bash
# Backend tests (à implémenter)
cd backend
npm test

# Frontend tests (à implémenter)
npm test
```

## 📈 Prochaines Étapes

### Phase 2 : Interface Frontend MCP (2 semaines)
- [ ] Panneau de gestion des outils
- [ ] Marketplace de serveurs MCP
- [ ] Modal de connexion OAuth
- [ ] Indicateurs visuels d'utilisation d'outils
- [ ] Dashboard de statistiques

### Phase 3 : Serveurs MCP Spécifiques (2 semaines)
- [ ] Serveur Gmail complet
- [ ] Serveur Outlook (Microsoft Graph)
- [ ] Serveur File System
- [ ] Serveur Notion

### Phase 4 : Features Entreprise (2-3 semaines)
- [ ] Multi-tenancy complet
- [ ] Dashboard admin
- [ ] Contrôle d'accès granulaire
- [ ] Serveurs MCP custom par organisation
- [ ] Audit logs
- [ ] Quotas et billing

### Phase 5 : Production (1-2 semaines)
- [ ] Tests unitaires et d'intégration
- [ ] Documentation API complète
- [ ] Docker & Kubernetes
- [ ] CI/CD Pipeline
- [ ] Monitoring (Prometheus, Grafana)
- [ ] Rate limiting

## 🤝 Contribution

Ce projet est en développement actif. Les contributions sont les bienvenues !

## 📝 License

À définir selon votre usage (MIT, Apache 2.0, etc.)

## 📞 Support

Pour toute question technique :
- Ouvrir une issue sur GitHub
- Contacter l'équipe de développement

---

**Version :** 2.0.0-alpha
**Dernière mise à jour :** 2025-11-06
