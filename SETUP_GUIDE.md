# 🚀 Guide de Démarrage - ChatAI MCP

Ce guide vous accompagne pas à pas pour installer et démarrer votre clone de Claude.ai avec support MCP.

## ⚡ Démarrage Rapide (10 minutes)

### 1️⃣ Prérequis

- **Node.js** 18+ : [Télécharger](https://nodejs.org/)
- **PostgreSQL** 14+ : [Télécharger](https://www.postgresql.org/download/)
- **Compte Google Cloud** (pour Gmail/Drive) : [Console](https://console.cloud.google.com/)
- **Clé API Gemini** : [Get API Key](https://makersuite.google.com/app/apikey)

### 2️⃣ Installation PostgreSQL

<details>
<summary><b>macOS</b></summary>

```bash
brew install postgresql@14
brew services start postgresql@14
createdb chataimcp
```
</details>

<details>
<summary><b>Ubuntu/Debian</b></summary>

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb chataimcp
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
```
</details>

<details>
<summary><b>Windows</b></summary>

1. Télécharger : https://www.postgresql.org/download/windows/
2. Installer avec le wizard
3. Ouvrir pgAdmin 4
4. Créer une base de données nommée `chataimcp`
</details>

### 3️⃣ Cloner et Installer

```bash
# Cloner le projet (si pas déjà fait)
git clone <votre-repo-url>
cd chatAIMCP

# Installer les dépendances frontend
npm install

# Installer les dépendances backend
cd backend
npm install
cd ..
```

### 4️⃣ Configuration

#### Créer le fichier `.env` backend

```bash
cd backend
cp .env.example .env
nano .env  # ou code .env / notepad .env
```

#### Configuration minimale requise

```env
# Database PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chataimcp
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Secret (changez-moi !)
JWT_SECRET=votre-secret-super-securise-changez-moi-123456

# Gemini AI (REQUIS)
GEMINI_API_KEY=votre-cle-gemini-ici

# Google OAuth (pour Gmail/Drive)
GOOGLE_CLIENT_ID=votre-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=votre-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
```

#### Obtenir une clé Gemini API

1. Aller sur https://makersuite.google.com/app/apikey
2. Créer une nouvelle clé API
3. Copier la clé dans `GEMINI_API_KEY`

#### Configurer Google OAuth (optionnel)

<details>
<summary>Cliquez pour voir les étapes détaillées</summary>

1. Aller sur https://console.cloud.google.com/
2. Créer un nouveau projet ou sélectionner un projet existant
3. Activer les APIs :
   - Gmail API
   - Google Drive API
4. Créer des identifiants OAuth 2.0 :
   - Type : Application Web
   - URI de redirection : `http://localhost:3001/auth/google/callback`
5. Copier le Client ID et Client Secret dans `.env`
</details>

### 5️⃣ Lancer l'Application

```bash
# Terminal 1 - Backend
cd backend
node src/server-mcp.js

# Terminal 2 - Frontend
cd ..  # retour à la racine
npm run dev
```

### 6️⃣ Vérifications

✅ **Backend** : http://localhost:3001/health
- Devrait afficher : `{"status":"ok","version":"2.0.0-mcp",...}`

✅ **Frontend** : http://localhost:5173
- Devrait afficher la page de login

✅ **API Info** : http://localhost:3001/api/info
- Liste tous les endpoints disponibles

## 🎯 Premier Test

### 1. Créer un Compte

1. Ouvrir http://localhost:5173
2. Cliquer sur "Sign Up"
3. Entrer email et mot de passe (min 6 caractères)
4. Cliquer sur "Sign Up"

### 2. Démarrer une Conversation

1. Cliquer sur "+ New Chat"
2. Taper : `Bonjour ! Peux-tu m'expliquer ce que tu peux faire ?`
3. L'IA répond via Gemini

### 3. Connecter des Outils MCP

1. Cliquer sur "My Tools" dans la sidebar
2. Cliquer sur "+ Add New Tool"
3. Parcourir les serveurs MCP disponibles
4. Sélectionner un serveur (ex: File System)
5. Cliquer sur "Connect"

### 4. Tester un Outil

Une fois un outil connecté :

**Exemple avec File System :**
```
"Lis le contenu du fichier README.md"
```

**Exemple avec Gmail (si configuré) :**
```
"Trouve mes emails de cette semaine qui parlent de projet"
```

## 🔧 Résolution de Problèmes

### Erreur : "Cannot connect to database"

```bash
# Vérifier que PostgreSQL est lancé
sudo systemctl status postgresql   # Linux
brew services list                  # macOS

# Tester la connexion
psql -U postgres -d chataimcp -h localhost
```

### Erreur : "GEMINI_API_KEY not configured"

1. Vérifier que `GEMINI_API_KEY` est dans `backend/.env`
2. Pas d'espaces autour du `=`
3. Redémarrer le serveur backend

### Port 3001 déjà utilisé

```bash
# Trouver le processus
lsof -i :3001        # macOS/Linux
netstat -ano | findstr :3001   # Windows

# Tuer le processus
kill -9 <PID>
```

### Erreur lors du démarrage backend

```bash
# Réinstaller les dépendances
cd backend
rm -rf node_modules package-lock.json
npm install

# Vérifier les permissions des serveurs MCP
chmod +x mcp-servers/filesystem/index.js
chmod +x mcp-servers/gmail/index.js
```

### Base de données existe déjà

```bash
# Réinitialiser la base de données
psql -U postgres -c "DROP DATABASE chataimcp;"
psql -U postgres -c "CREATE DATABASE chataimcp;"

# Redémarrer le backend (il va recréer les tables)
node src/server-mcp.js
```

## 📚 Serveurs MCP Disponibles

| Serveur | Description | Authentification | Status |
|---------|-------------|------------------|--------|
| 📁 **File System** | Accès aux fichiers locaux | Non | ✅ Prêt |
| 📧 **Gmail** | Emails Gmail | OAuth Google | ✅ Prêt |
| ☁️ **Google Drive** | Fichiers Drive | OAuth Google | ⚙️ Config |
| 🧠 **Memory** | Mémoire persistante | Non | ⚙️ NPX |
| 🐙 **GitHub** | Repos et issues | OAuth GitHub | ⚙️ NPX |

**✅ Prêt** : Serveur custom implémenté
**⚙️ Config** : Nécessite configuration OAuth
**⚙️ NPX** : Disponible via package NPX

## 🛠️ Commandes Utiles

```bash
# Voir les logs backend en temps réel
cd backend && node src/server-mcp.js

# Réinitialiser la base de données
psql -U postgres -c "DROP DATABASE chataimcp; CREATE DATABASE chataimcp;"

# Tester un endpoint API
curl http://localhost:3001/api/mcp/servers

# Vérifier les outils MCP disponibles
curl http://localhost:3001/api/chat/available-tools \
  -H "Authorization: Bearer VOTRE_TOKEN"

# Rebuild frontend
npm run build
```

## 🎨 Personnalisation

### Ajouter un Dossier Autorisé pour File System

Éditer `backend/.env` :

```env
FILESYSTEM_ALLOWED_PATHS=/chemin/vers/dossier1,/chemin/vers/dossier2
```

### Créer un Serveur MCP Custom

1. Copier un serveur existant comme template :
   ```bash
   cp -r backend/mcp-servers/filesystem backend/mcp-servers/mon-serveur
   ```

2. Éditer `backend/mcp-servers/mon-serveur/index.js`

3. Ajouter le serveur dans la base de données via l'API

## 📖 Documentation Complète

- **Architecture** : [README-MCP.md](./README-MCP.md)
- **Guide Rapide** : [QUICK_START.md](./QUICK_START.md)
- **Référence API** : http://localhost:3001/api/info

## 🆘 Aide

- **GitHub Issues** : [Ouvrir une issue](https://github.com/votre-repo/issues)
- **Documentation MCP** : https://modelcontextprotocol.io
- **Google Gemini API** : https://ai.google.dev/docs

## 🚀 Déploiement Production

Voir [README-MCP.md](./README-MCP.md) section "Déploiement Production"

---

**Temps de setup estimé** : 10-15 minutes
**Niveau** : ⭐⭐ Intermédiaire

✨ **Bon développement !**
