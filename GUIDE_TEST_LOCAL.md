# Guide pour Tester Localement avec Cursor (Sans PostgreSQL)

## Problème
Les serveurs tournent dans l'environnement distant de Claude Code, donc vous ne pouvez pas y accéder depuis votre navigateur local.

## Solution : Lancer Localement avec SQLite

### Option 1 : Utiliser l'Ancien Serveur (SQLite - Plus Simple)

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

5. **Lancez le serveur backend (ancienne version SQLite)**
```bash
# Dans /backend
node src/server.js
```

> **Note** : Le fichier `server.js` utilise SQLite et ne nécessite pas PostgreSQL

6. **Dans un nouveau terminal, lancez le frontend**
```bash
# À la racine du projet
npm run dev
```

7. **Ouvrez votre navigateur**
```
http://localhost:5173
```

### Option 2 : Installer PostgreSQL Localement (Plus Complet)

Si vous voulez tester la version complète avec MCP :

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

Ensuite, configurez `.env` comme dans l'Option 1 et lancez :

```bash
# Backend
cd backend
node src/server-mcp.js

# Frontend (nouveau terminal)
npm run dev
```

### Option 3 : Utiliser Docker (Recommandé pour Développement)

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

## Vérification que Tout Fonctionne

1. **Backend** : Ouvrez http://localhost:3001/health
   - Vous devriez voir : `{"status":"ok",...}`

2. **Frontend** : Ouvrez http://localhost:5173
   - Vous devriez voir la page de connexion/inscription

3. **Créez un compte** et testez le chat

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
# Vérifiez que /backend/database.sqlite existe
ls -la backend/database.sqlite
```

## Recommandation

Pour un test rapide, utilisez **Option 1 (SQLite)** car :
- ✅ Pas besoin d'installer PostgreSQL
- ✅ Prend moins d'espace disque
- ✅ Démarre instantanément
- ❌ Mais vous n'aurez pas les fonctionnalités MCP complètes

Pour le développement complet avec MCP, utilisez **Option 3 (Docker)**.
