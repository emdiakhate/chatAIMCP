# Guide pour Tester Localement avec Cursor (Sans PostgreSQL)

## Problème
Les serveurs tournent dans l'environnement distant de Claude Code, donc vous ne pouvez pas y accéder depuis votre navigateur local.

## Solution : Lancer Localement avec SQLite

### 🎉 Option 1 : Serveur SQLite avec MCP (RECOMMANDÉ !)

**NOUVEAU ! Toutes les fonctionnalités MCP sont maintenant disponibles avec SQLite !**

Vous pouvez maintenant tester toutes les fonctionnalités MCP (marketplace, connexions, tool calling) **sans installer PostgreSQL**.

#### Étapes :

1. **Ouvrez le projet dans Cursor**

2. **Installez les dépendances backend**
```bash
cd backend
npm install
```

3. **Installez les dépendances frontend**
```bash
cd ..
npm install
```

4. **Créez le fichier .env dans /backend**
```bash
cd backend
cat > .env << 'EOF'
# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# JWT Secret
JWT_SECRET=dev-secret-key-change-in-production-12345678

# OpenRouter API (pour le LLM)
OPENROUTER_API_KEY=votre-clé-openrouter-ici
OPENROUTER_MODEL=google/gemini-2.5-pro

# Google OAuth (Optionnel pour Gmail/Drive)
GOOGLE_CLIENT_ID=votre-client-id
GOOGLE_CLIENT_SECRET=votre-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback

# Filesystem MCP
FILESYSTEM_ALLOWED_PATHS=/tmp,./documents
MCP_SERVERS_PATH=./mcp-servers
EOF
```

5. **Lancez le serveur backend avec MCP (SQLite)**
```bash
# Dans /backend
node src/server-sqlite-mcp.js
```

Vous devriez voir :
```
🚀 ChatAI MCP Server v2.0.0 (SQLite)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 Server:          http://localhost:3001
✨ MCP Features (SQLite):
   • Tool calling via Model Context Protocol
   • SQLite database (no PostgreSQL needed!)
```

> **🎉 Important !** Le fichier `server-sqlite-mcp.js` utilise SQLite avec **toutes les fonctionnalités MCP** - pas besoin de PostgreSQL !

6. **Dans un nouveau terminal, lancez le frontend**
```bash
# À la racine du projet
npm run dev
```

7. **Ouvrez votre navigateur**
```
http://localhost:5173
```

#### Fonctionnalités Disponibles :

✅ **Marketplace MCP** - Parcourir et connecter des outils
✅ **5 Serveurs MCP pré-configurés** :
   - 📁 Local Files (filesystem)
   - 📧 Gmail
   - ☁️ Google Drive
   - 🐙 GitHub
   - 🧠 Memory

✅ **Tool Calling** - Le modèle utilise automatiquement les outils connectés
✅ **Gestion des Connexions** - Connect/disconnect des serveurs MCP
✅ **Statistiques** - Suivi des appels d'outils
✅ **OAuth Support** - Pour Gmail, Drive, GitHub

### Option 2 : Ancien Serveur SQLite (Sans MCP)

Si vous voulez juste tester le chat basique **sans** les fonctionnalités MCP :

```bash
# Dans /backend
node src/server.js
```

> **Note** : Le fichier `server.js` utilise SQLite mais n'a **pas** les fonctionnalités MCP (marketplace, tool calling, etc.)

### Option 3 : Installer PostgreSQL Localement

Si vous préférez PostgreSQL ou si vous rencontrez des problèmes avec SQLite :

#### Windows

1. **Télécharger PostgreSQL** : https://www.postgresql.org/download/windows/
2. **Installer avec les options par défaut**
3. **Créer la base de données** :
```bash
psql -U postgres
CREATE DATABASE chataimcp;
\q
```

#### macOS (avec Homebrew)

```bash
brew install postgresql@16
brew services start postgresql@16
createdb chataimcp
```

#### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo -u postgres createdb chataimcp
```

Ensuite, configurez `.env` et lancez :

```bash
# Backend
cd backend
node src/server-mcp.js

# Frontend (nouveau terminal)
npm run dev
```

### Option 4 : Utiliser Docker (Recommandé pour Développement)

Créez un fichier `docker-compose.yml` à la racine :

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: chataimcp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: chataimcp
      DB_USER: postgres
      DB_PASSWORD: postgres
    depends_on:
      - postgres
    volumes:
      - ./backend:/app
      - /app/node_modules

  frontend:
    build: .
    ports:
      - "5173:5173"
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev

volumes:
  postgres_data:
```

Puis lancez :
```bash
docker-compose up
```

## Comparaison des Options

| Fonctionnalité | server.js (SQLite) | server-sqlite-mcp.js (SQLite) | server-mcp.js (PostgreSQL) |
|---|---|---|---|
| Base de données | SQLite | SQLite | PostgreSQL |
| Installation requise | Aucune | Aucune | PostgreSQL |
| Espace disque | ~10 Mo | ~20 Mo | ~100 Mo+ |
| **MCP Marketplace** | ❌ Non | ✅ Oui | ✅ Oui |
| **Tool Calling** | ❌ Non | ✅ Oui | ✅ Oui |
| **Connexions MCP** | ❌ Non | ✅ Oui | ✅ Oui |
| Chat de base | ✅ Oui | ✅ Oui | ✅ Oui |
| OAuth Google | ✅ Oui | ✅ Oui | ✅ Oui |
| Performance | Bonne | Bonne | Meilleure |
| Multi-tenant | ❌ Non | ✅ Oui | ✅ Oui |

## Vérification que Tout Fonctionne

1. **Backend** : Ouvrez http://localhost:3001/health
   - Vous devriez voir : `{"status":"ok", "version":"2.0.0-mcp-sqlite", "database":"SQLite"}`

2. **Frontend** : Ouvrez http://localhost:5173
   - Vous devriez voir la page de connexion/inscription

3. **Créez un compte** et testez le chat

4. **Testez MCP** :
   - Cliquez sur "My Tools" dans la sidebar
   - Vous devriez voir les 5 serveurs MCP disponibles
   - Connectez "Local Files" (filesystem)
   - Posez une question comme "Liste les fichiers dans /tmp"

## Dépannage

### "Cannot find module" ou erreurs d'import
```bash
# Réinstallez les dépendances
rm -rf node_modules package-lock.json
npm install

cd backend
rm -rf node_modules package-lock.json
npm install
```

### Port déjà utilisé
```bash
# Trouvez et tuez le processus
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3001 | xargs kill -9
```

### Base de données non trouvée (SQLite)
```bash
# SQLite crée automatiquement le fichier
# Vérifiez que /backend/database/chatai-mcp.db existe
ls -la backend/database/
```

### Serveurs MCP ne se chargent pas
```bash
# Vérifiez les logs du backend
# Vous devriez voir : "✅ 5 serveurs MCP créés avec succès"

# Ouvrez le navigateur et vérifiez la console (F12)
# Cherchez les logs [MCPMarketplace]
```

## Recommandation

Pour un test rapide et complet, utilisez **Option 1 (server-sqlite-mcp.js)** car :
- ✅ Pas besoin d'installer PostgreSQL
- ✅ Prend moins d'espace disque
- ✅ Démarre instantanément
- ✅ **TOUTES les fonctionnalités MCP sont disponibles !**
- ✅ Marketplace, connexions, tool calling, tout fonctionne !

C'est la solution parfaite pour tester en local avec Cursor sans complications.

## Différences Techniques

### SQLite vs PostgreSQL pour MCP

Les fichiers créés pour SQLite :
- `/backend/src/config/database-sqlite-mcp.js` - Configuration SQLite avec tables MCP
- `/backend/src/routes/mcp-servers-sqlite.js` - Routes MCP adaptées pour SQLite
- `/backend/src/routes/mcp-connections-sqlite.js` - Gestion des connexions MCP (SQLite)
- `/backend/src/routes/chat-mcp-sqlite.js` - Chat avec tool calling (SQLite)
- `/backend/src/server-sqlite-mcp.js` - Serveur principal SQLite + MCP

Principales adaptations :
- Paramètres `$1, $2` → `?` (SQLite bind params)
- `JSONB` → `TEXT` + JSON.parse/stringify
- `SERIAL` → `INTEGER PRIMARY KEY AUTOINCREMENT`
- `ILIKE` → `LIKE` (SQLite n'a pas ILIKE)
- Pas de transactions complexes (simplifiées pour SQLite)

Mais toutes les fonctionnalités sont présentes ! 🎉
