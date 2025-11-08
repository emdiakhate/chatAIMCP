# 📋 Guide de Configuration des Outils MCP

Ce document liste tous les outils MCP disponibles et les étapes pour les configurer.

## ✅ Outils Déjà Configurés

### 1. **Local Files** 📁
- **Status**: ✅ Configuré
- **Authentification**: Aucune
- **Configuration**: Utilisez le bouton "Configurer" dans le panneau MCP Tools pour définir les dossiers autorisés
- **Dossier par défaut**: `/Users/malick/Downloads`

### 2. **Memory** 🧠
- **Status**: ✅ Configuré
- **Authentification**: Aucune
- **Configuration**: Aucune configuration nécessaire

---

## 🔧 Outils à Configurer

### **Groupe 1: Google Services (OAuth 2.0)**

#### 3. **Gmail** 📧
- **Status**: ⚠️ OAuth à compléter
- **Authentification**: OAuth 2.0 (Google)
- **Étapes**:
  1. ✅ Client ID et Secret déjà configurés dans `.env`
  2. ⚠️ **PROBLÈME ACTUEL**: La connexion MCP est créée mais l'OAuth n'est pas complété
  3. **Solution**: 
     - Cliquez sur "Connect" pour Gmail
     - Le modal OAuth s'ouvrira automatiquement
     - Complétez l'autorisation Google
     - La connexion MCP sera créée automatiquement après l'OAuth
  4. **URL de redirection à ajouter dans Google Console**:
     - `http://localhost:3001/api/auth/google/callback`
  5. **Scopes requis**: 
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.send`

#### 4. **Google Drive** ☁️
- **Status**: ⚠️ OAuth à compléter
- **Authentification**: OAuth 2.0 (Google)
- **Étapes**:
  1. ✅ Client ID et Secret déjà configurés (même que Gmail)
  2. Cliquez sur "Connect" pour Google Drive
  3. Le modal OAuth s'ouvrira (utilise le même OAuth que Gmail)
  4. Complétez l'autorisation Google
  5. **Scopes requis**: 
     - `https://www.googleapis.com/auth/drive.readonly`

#### 5. **Google Sheets** 📊
- **Status**: ⚠️ OAuth à compléter
- **Authentification**: OAuth 2.0 (Google)
- **Étapes**:
  1. ✅ Client ID et Secret déjà configurés (même que Gmail)
  2. Cliquez sur "Connect" pour Google Sheets
  3. Complétez l'autorisation Google
  4. **Scopes requis**: 
     - `https://www.googleapis.com/auth/spreadsheets`

---

### **Groupe 2: API Key Based Tools**

#### 6. **Anthropic (Claude)** 🤖
- **Status**: ⚠️ API Key à configurer
- **Authentification**: API Key
- **Étapes**:
  1. Allez sur https://console.anthropic.com/settings/keys
  2. Créez une nouvelle API key
  3. Cliquez sur "Connect" pour Anthropic
  4. Entrez votre API key dans le modal qui s'ouvre
  5. Format: `sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxx`

#### 7. **OpenAI (GPT & DALL-E)** 🧠
- **Status**: ⚠️ API Key à configurer
- **Authentification**: API Key
- **Étapes**:
  1. Allez sur https://platform.openai.com/api-keys
  2. Créez une nouvelle API key
  3. Cliquez sur "Connect" pour OpenAI
  4. Entrez votre API key dans le modal qui s'ouvre
  5. Format: `sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx`

#### 8. **Linear** 🚀
- **Status**: ⚠️ API Key à configurer
- **Authentification**: API Key
- **Étapes**:
  1. Allez sur https://linear.app/settings/api
  2. Créez une nouvelle API key
  3. Cliquez sur "Connect" pour Linear
  4. Entrez votre API key dans le modal qui s'ouvre
  5. Format: `lin_api_...`

#### 9. **Airtable** 📊
- **Status**: ⚠️ API Key à configurer
- **Authentification**: API Key (Personal Access Token)
- **Étapes**:
  1. Allez sur https://airtable.com/create/tokens
  2. Créez un nouveau Personal Access Token
  3. Cliquez sur "Connect" pour Airtable
  4. Entrez votre token dans le modal qui s'ouvre
  5. Format: `pat...`

#### 10. **HubSpot** 🧲
- **Status**: ⚠️ API Key à configurer
- **Authentification**: API Key
- **Étapes**:
  1. Allez sur https://app.hubspot.com/settings/api-key
  2. Créez une nouvelle API key
  3. Cliquez sur "Connect" pour HubSpot
  4. Entrez votre API key dans le modal qui s'ouvre
  5. Format: `pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

---

### **Groupe 3: OAuth 2.0 (Autres Providers)**

#### 11. **Slack** 💬
- **Status**: ⚠️ OAuth à configurer
- **Authentification**: OAuth 2.0 (Slack)
- **Étapes**:
  1. Créez une Slack App sur https://api.slack.com/apps
  2. Configurez les OAuth Redirect URLs:
     - `http://localhost:3001/api/auth/slack/callback`
  3. Notez votre Client ID et Client Secret
  4. Ajoutez-les dans `.env`:
     ```
     SLACK_CLIENT_ID=votre_client_id
     SLACK_CLIENT_SECRET=votre_client_secret
     ```
  5. Cliquez sur "Connect" pour Slack
  6. Le modal OAuth s'ouvrira automatiquement
  7. **Scopes requis**: 
     - `channels:read`
     - `chat:write`
     - `users:read`
     - `channels:history`

#### 12. **Salesforce** ☁️
- **Status**: ⚠️ OAuth à configurer
- **Authentification**: OAuth 2.0 (Salesforce)
- **Étapes**:
  1. Créez une Connected App dans Salesforce
  2. Configurez les OAuth Redirect URLs:
     - `http://localhost:3001/api/auth/salesforce/callback`
  3. Notez votre Client ID et Client Secret
  4. Ajoutez-les dans `.env`:
     ```
     SALESFORCE_CLIENT_ID=votre_client_id
     SALESFORCE_CLIENT_SECRET=votre_client_secret
     SALESFORCE_INSTANCE_URL=https://votre-instance.salesforce.com
     ```
  5. Cliquez sur "Connect" pour Salesforce
  6. Le modal OAuth s'ouvrira automatiquement
  7. **Scopes requis**: 
     - `api`
     - `refresh_token`

#### 13. **Microsoft Teams** 👥
- **Status**: ⚠️ OAuth à configurer
- **Authentification**: OAuth 2.0 (Microsoft)
- **Étapes**:
  1. Créez une Azure App Registration sur https://portal.azure.com
  2. Configurez les OAuth Redirect URLs:
     - `http://localhost:3001/api/auth/teams/callback`
  3. Notez votre Client ID et Client Secret
  4. Ajoutez-les dans `.env`:
     ```
     TEAMS_CLIENT_ID=votre_client_id
     TEAMS_CLIENT_SECRET=votre_client_secret
     TEAMS_TENANT_ID=votre_tenant_id
     ```
  5. Cliquez sur "Connect" pour Teams
  6. Le modal OAuth s'ouvrira automatiquement
  7. **Scopes requis**: 
     - `Chat.ReadWrite`
     - `OnlineMeetings.ReadWrite`
     - `Files.ReadWrite`

---

### **Groupe 4: OAuth 2.0 (À venir)**

#### 14. **GitHub** 🐙
- **Status**: ⏳ Configuration à implémenter
- **Authentification**: OAuth 2.0 (GitHub)
- **Note**: Le modal OAuth n'est pas encore implémenté dans le frontend

#### 15. **Notion** 📝
- **Status**: ⏳ Configuration à implémenter
- **Authentification**: OAuth 2.0 (Notion)
- **Note**: Le modal OAuth n'est pas encore implémenté dans le frontend

#### 16. **Jira** 🎯
- **Status**: ⏳ Configuration à implémenter
- **Authentification**: OAuth 2.0 (Atlassian)
- **Note**: Le modal OAuth n'est pas encore implémenté dans le frontend

---

### **Groupe 5: Credentials Based**

#### 17. **PostgreSQL** 🐘
- **Status**: ⚠️ Credentials à configurer
- **Authentification**: Credentials (host, port, database, user, password)
- **Note**: Configuration manuelle requise via le modal de configuration

#### 18. **MongoDB** 🍃
- **Status**: ⚠️ Credentials à configurer
- **Authentification**: Credentials (connection string)
- **Note**: Configuration manuelle requise via le modal de configuration

---

### **Groupe 6: Sans Authentification**

#### 19. **Puppeteer** 🤖
- **Status**: ✅ Prêt à connecter
- **Authentification**: Aucune
- **Étapes**: Cliquez simplement sur "Connect"

---

## 🔍 Résumé des Actions Requises

### Actions Immédiates (Problèmes à résoudre):
1. ✅ **Gmail**: Corriger le flux OAuth pour que la connexion MCP ne soit créée qu'après l'OAuth complété
2. ⚠️ **Google Drive**: Même problème que Gmail
3. ⚠️ **Google Sheets**: Même problème que Gmail

### Actions de Configuration:
1. **API Keys** (5 outils): Anthropic, OpenAI, Linear, Airtable, HubSpot
2. **OAuth** (3 outils): Slack, Salesforce, Microsoft Teams
3. **Credentials** (2 outils): PostgreSQL, MongoDB

### Actions Futures:
1. Implémenter les modals OAuth pour: GitHub, Notion, Jira
2. Implémenter les modals de configuration pour: PostgreSQL, MongoDB

---

## 📝 Notes Importantes

1. **Google OAuth**: Tous les services Google (Gmail, Drive, Sheets) utilisent le même Client ID/Secret mais avec des scopes différents.

2. **URLs de Redirection**: Assurez-vous que toutes les URLs de redirection OAuth sont configurées dans les consoles des providers respectifs.

3. **Variables d'Environnement**: Toutes les clés API et secrets doivent être ajoutés dans le fichier `.env` du backend.

4. **Test de Connexion**: Après configuration, testez chaque outil dans une conversation pour vérifier qu'il fonctionne correctement.

---

## 🐛 Problème Actuel avec Gmail

**Symptôme**: Gmail affiche "Connecté" mais l'OAuth n'est pas vraiment complété.

**Cause**: La connexion MCP est créée avant que l'OAuth soit complété.

**Solution Implémentée**: 
- Le modal OAuth s'ouvre maintenant automatiquement lors du clic sur "Connect"
- La connexion MCP n'est créée qu'après la complétion de l'OAuth
- Vérifiez que l'OAuth est bien complété avant de créer la connexion

**À Vérifier**:
1. Le modal OAuth s'ouvre-t-il correctement?
2. L'OAuth se complète-t-il correctement?
3. La connexion MCP est-elle créée après l'OAuth?

