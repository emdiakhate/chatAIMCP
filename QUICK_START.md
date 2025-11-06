# 🚀 Quick Start Guide - ChatAI MCP

## Démarrage Rapide (5 minutes)

### 1️⃣ Installation PostgreSQL

**macOS :**
```bash
brew install postgresql@14
brew services start postgresql@14
createdb chataimcp
```

**Ubuntu/Debian :**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb chataimcp
```

**Windows :**
- Télécharger PostgreSQL : https://www.postgresql.org/download/windows/
- Installer et démarrer le service
- Créer la base via pgAdmin : `chataimcp`

### 2️⃣ Configuration

```bash
# Cloner et installer
cd chatAIMCP/backend
npm install

# Configurer l'environnement
cp .env.example .env
nano .env
```

**Configuration minimale dans `.env` :**

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chataimcp
DB_USER=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=changez-moi-en-production-123456

# Gemini AI (REQUIS)
GEMINI_API_KEY=votre-cle-gemini-ici
```

**🔑 Obtenir une clé Gemini :**
1. Allez sur https://makersuite.google.com/app/apikey
2. Créez une clé API
3. Copiez-la dans `.env`

### 3️⃣ Lancer l'Application

```bash
# Terminal 1 - Backend
cd backend
node src/server-mcp.js

# Terminal 2 - Frontend
cd ..
npm run dev
```

**✅ Vérifications :**
- Backend : http://localhost:3001/health
- Frontend : http://localhost:5173

### 4️⃣ Premier Test

1. Ouvrez http://localhost:5173
2. Créez un compte
3. Créez une conversation
4. Testez : "Bonjour, peux-tu m'aider ?"

## 🔌 Ajouter Votre Premier Outil MCP

### Exemple : Gmail

1. **Configurer OAuth Google :**

Allez sur https://console.cloud.google.com/

```bash
# Créer un projet
# Activer Gmail API
# Créer des identifiants OAuth 2.0
# Ajouter redirect URI : http://localhost:3001/auth/google/callback
```

2. **Mettre à jour `.env` :**

```env
GOOGLE_CLIENT_ID=votre-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=votre-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
```

3. **Redémarrer le serveur**

4. **Connecter Gmail :**
   - Via l'API ou le frontend (à venir)
   - Suivre le flux OAuth

5. **Tester dans le chat :**
```
"Cherche mes emails de cette semaine"
```

## 🛠️ Serveurs MCP Pré-configurés

| Serveur | Description | Auth Requise | Status |
|---------|-------------|--------------|--------|
| 📁 Filesystem | Fichiers locaux | Non | ✅ Disponible |
| 📧 Gmail | Emails Gmail | OAuth Google | ✅ Disponible |
| ☁️ Google Drive | Fichiers Drive | OAuth Google | ✅ Disponible |
| 🐙 GitHub | Repos, Issues, PRs | OAuth GitHub | ✅ Disponible |
| 🧠 Memory | Mémoire persistante | Non | ✅ Disponible |
| 📮 Outlook | Emails Outlook | OAuth Microsoft | 🔄 À venir |
| 📝 Notion | Pages Notion | API Key | 🔄 À venir |

## 🐛 Dépannage

### Erreur : "Cannot connect to database"

```bash
# Vérifier que PostgreSQL est lancé
sudo systemctl status postgresql   # Linux
brew services list                  # macOS

# Vérifier les credentials dans .env
psql -U postgres -d chataimcp      # Test de connexion
```

### Erreur : "GEMINI_API_KEY not configured"

- Vérifiez que `GEMINI_API_KEY` est défini dans `.env`
- Redémarrez le serveur backend

### Erreur : "Port 3001 already in use"

```bash
# Trouver le processus
lsof -i :3001        # macOS/Linux
netstat -ano | findstr :3001   # Windows

# Tuer le processus
kill -9 <PID>
```

### La connexion MCP échoue

1. Vérifier les logs du serveur
2. Tester la connexion manuellement :

```bash
curl -X POST http://localhost:3001/api/mcp/connections/:id/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📚 Ressources

- **Documentation complète :** [README-MCP.md](./README-MCP.md)
- **API Reference :** http://localhost:3001/api/info
- **MCP Specification :** https://modelcontextprotocol.io

## 🆘 Besoin d'Aide ?

- Consulter les logs : `backend/src/server-mcp.js`
- Vérifier la santé : http://localhost:3001/health
- Ouvrir une issue GitHub

## ⚡ Commandes Utiles

```bash
# Réinitialiser la DB
psql -U postgres -c "DROP DATABASE chataimcp;"
psql -U postgres -c "CREATE DATABASE chataimcp;"

# Voir les logs PostgreSQL
tail -f /var/log/postgresql/postgresql-14-main.log

# Tester une route API
curl http://localhost:3001/api/mcp/servers

# Générer un token JWT de test
node -e "console.log(require('jsonwebtoken').sign({userId:1}, 'your-secret'))"
```

## 🎯 Prochaines Étapes

1. ✅ Installer et tester l'app
2. 🔌 Connecter votre premier outil MCP
3. 💬 Tester le chat avec tool calling
4. 📊 Explorer les statistiques d'utilisation
5. 🚀 Déployer en production (voir README-MCP.md)

---

**Temps estimé de setup :** 5-10 minutes
**Difficulté :** ⭐⭐ (Intermédiaire)
