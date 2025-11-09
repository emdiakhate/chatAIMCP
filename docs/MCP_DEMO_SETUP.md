# 🚀 MCP Demo Setup - 8 Tools Ready in 10 Minutes

This guide will help you connect **8 powerful MCP tools** for an impressive demo of your chatAI application.

## 📋 Quick Overview

You'll connect these 8 tools:

1. **🧠 Memory** - Persistent AI memory (no auth needed)
2. **📁 Filesystem** - Local file access (no auth needed)
3. **☁️ Google Drive** - Cloud storage (OAuth)
4. **📧 Gmail** - Email access (OAuth)
5. **💬 Slack** - Team messaging (OAuth)
6. **🐙 GitHub** - Code repositories (API key or OAuth)
7. **🐘 PostgreSQL** - Database queries (credentials)
8. **🤖 Puppeteer** - Web scraping (no auth needed)

## ⚡ Quick Start (5 minutes for tools without auth)

### Step 1: Start the MCP-Enabled Server

```bash
# Stop any running backend
cd backend

# Install MCP packages if needed
npm install

# Start the MCP server
npm run dev
```

**Expected output:**
```
🚀 ChatAI MCP Server v2.0.0 (SQLite)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 Server:          http://localhost:3001
🏥 Health check:    http://localhost:3001/health
✨ MCP Features (SQLite):
   • Tool calling via Model Context Protocol
   • Dynamic server connection management
```

### Step 2: Start Frontend

```bash
# New terminal
npm run dev
```

### Step 3: Login and Go to Settings

1. Open http://localhost:5173
2. Login to your account
3. Click **"Settings"** in the sidebar

### Step 4: Connect MCP Tools (No Auth Required First)

In the Settings page, you should see an **MCP Servers** section.

#### Tool 1: 🧠 Memory (Instant)

**What it does:** Gives AI persistent memory across conversations

1. Find "Memory" in the MCP servers list
2. Click **"Connect"**
3. ✅ Done! No configuration needed

**Test it:**
- Send: "Remember that my name is John and I love JavaScript"
- Send: "What's my name and what do I love?"

---

#### Tool 2: 📁 Filesystem (30 seconds)

**What it does:** Let AI read/write local files, search directories

1. Find "Local Files" (Filesystem)
2. Click **"Connect"**
3. Configure allowed path:
   - **Path:** `/tmp` (safe default for testing)
   - Or use your project path: `/home/user/chatAIMCP`
4. Click **"Save"**
5. ✅ Connected!

**Test it:**
- Send: "List files in /tmp"
- Send: "Read the package.json file in my project"

---

#### Tool 3: 🤖 Puppeteer (Instant)

**What it does:** Web scraping, screenshots, automation

1. Find "Puppeteer" in the list
2. Click **"Connect"**
3. ✅ Done! No auth needed

**Test it:**
- Send: "Take a screenshot of https://example.com"
- Send: "Extract the main text from https://news.ycombinator.com"

---

**🎉 You now have 3/8 tools connected! These are ready for demo.**

## 🔐 OAuth Tools (15 minutes total)

### Step 5: Google Services (Drive + Gmail)

**Prerequisites:**
- Google Cloud Project
- OAuth 2.0 credentials configured

#### Option A: If you already have Google OAuth setup

1. Find "Google Drive" → Click **"Connect"**
2. Click the OAuth button → Authorize access
3. Repeat for "Gmail"
4. ✅ Both connected!

**Test Drive:**
- Send: "Search for files with 'proposal' in my Drive"
- Send: "List my recent Google Drive files"

**Test Gmail:**
- Send: "Search for emails from [email protected]"
- Send: "Show my unread emails"

#### Option B: Quick Google OAuth Setup (10 min)

```bash
# Add to backend/.env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
```

1. Go to https://console.cloud.google.com
2. Create a project (if needed)
3. Enable APIs: Gmail API, Google Drive API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Redirect URI: `http://localhost:3001/auth/google/callback`
5. Copy Client ID and Secret to `.env`
6. Restart backend

Then connect Drive + Gmail from the UI.

---

### Step 6: 💬 Slack

**What it does:** Read/send Slack messages, list channels

```bash
# Add to backend/.env
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_REDIRECT_URI=http://localhost:3001/auth/slack/callback
```

1. Go to https://api.slack.com/apps
2. Create a new app
3. OAuth & Permissions → Add scopes:
   - `channels:read`
   - `chat:write`
   - `users:read`
   - `channels:history`
4. Install to workspace
5. Copy credentials to `.env`
6. Restart backend
7. Connect from UI

**Test:**
- Send: "List my Slack channels"
- Send: "Post 'Hello from AI!' to #general"

---

### Step 7: 🐙 GitHub (API Key - 2 minutes)

**What it does:** Search code, list repos, create issues

#### Quick Setup with Personal Access Token

1. Go to https://github.com/settings/tokens
2. Generate new token (classic)
3. Select scopes: `repo`, `read:user`
4. Copy the token

```bash
# Add to backend/.env
GITHUB_TOKEN=ghp_your_token_here
```

5. Restart backend
6. Find "GitHub" → Click **"Connect"**
7. ✅ Connected!

**Test:**
- Send: "List my GitHub repositories"
- Send: "Search for 'authentication' in my repos"

---

### Step 8: 🐘 PostgreSQL (5 minutes if you have a DB)

**What it does:** Query databases, analyze data

#### Option A: Use existing database

```bash
# Add to backend/.env
POSTGRES_CONNECTION_STRING=postgresql://user:password@localhost:5432/dbname
```

1. Find "PostgreSQL" → Click **"Connect"**
2. Enter connection string
3. ✅ Connected!

**Test:**
- Send: "List all tables in the database"
- Send: "Show me the schema of the users table"

#### Option B: Quick local PostgreSQL (if needed)

```bash
# Using Docker
docker run --name demo-postgres -e POSTGRES_PASSWORD=demo123 -p 5432:5432 -d postgres

# Connection string
POSTGRES_CONNECTION_STRING=postgresql://postgres:demo123@localhost:5432/postgres
```

---

## 🎯 Demo Scenarios

### Scenario 1: Multi-Tool Workflow

**Prompt:**
```
1. Search my emails for messages from clients this week
2. For each email, extract the main topics
3. Store these topics in memory with the client name
4. Create a summary and save it to /tmp/client-summary.txt
```

**Tools used:** Gmail → Memory → Filesystem (3 tools in one flow!)

---

### Scenario 2: Code Research

**Prompt:**
```
Search my GitHub repos for authentication code,
read the relevant files, and explain how the auth flow works
```

**Tools used:** GitHub → Filesystem (if local)

---

### Scenario 3: Web to Storage

**Prompt:**
```
Go to https://news.ycombinator.com,
extract the top 5 stories with links,
and save them to my Google Drive as a markdown file
```

**Tools used:** Puppeteer → Google Drive

---

### Scenario 4: Data Analysis

**Prompt:**
```
Query the users table in my database,
analyze the user growth by month,
and post a summary to #analytics in Slack
```

**Tools used:** PostgreSQL → Slack

---

## 🐛 Troubleshooting

### "Server not found" error

**Solution:**
```bash
# Check the MCP server is running
curl http://localhost:3001/health

# Should return: {"status":"ok","version":"2.0.0-mcp-sqlite",...}
```

### "Connection failed" for OAuth tools

**Causes:**
1. Missing credentials in `.env`
2. Backend not restarted after adding credentials
3. OAuth callback URL mismatch

**Solution:**
```bash
# 1. Verify .env has the right values
cat backend/.env | grep CLIENT_ID

# 2. Restart backend
cd backend && npm run dev

# 3. Check OAuth config matches in provider dashboard
```

### "Tool not available" error

**Solution:**
1. Go to Settings → MCP Servers
2. Check the tool status:
   - 🟢 Active = Connected
   - 🔴 Disconnected = Click "Reconnect"
   - ⚠️ Error = Check logs

### Memory issues

**Solution:**
```bash
# Clear MCP client cache
rm -rf backend/database/mcp-cache/*

# Restart backend
cd backend && npm run dev
```

---

## 📊 Connection Status Reference

| Tool | Auth Type | Setup Time | Demo Value |
|------|-----------|------------|-----------|
| 🧠 Memory | None | 10 sec | ⭐⭐⭐⭐⭐ Essential |
| 📁 Filesystem | None | 30 sec | ⭐⭐⭐⭐⭐ Essential |
| 🤖 Puppeteer | None | 10 sec | ⭐⭐⭐⭐ Very Cool |
| 🐙 GitHub | API Key | 2 min | ⭐⭐⭐⭐ Developer wow |
| 📧 Gmail | OAuth | 10 min | ⭐⭐⭐⭐⭐ Business wow |
| ☁️ Drive | OAuth | 10 min | ⭐⭐⭐⭐ Business wow |
| 💬 Slack | OAuth | 15 min | ⭐⭐⭐⭐ Team wow |
| 🐘 Postgres | Credentials | 5 min | ⭐⭐⭐ Analytics wow |

## ✅ Minimum Viable Demo (3 tools, 2 minutes)

For the fastest demo setup:

1. **Memory** (10 sec)
2. **Filesystem** (30 sec)
3. **Puppeteer** (10 sec)

**Demo script:**
```
User: "Remember that I'm working on the chatAI project"
AI: ✅ Stored in memory

User: "Read my package.json file"
AI: ✅ Shows file contents

User: "Extract the title from https://example.com"
AI: ✅ Scrapes and shows content

User: "What project am I working on?"
AI: "You're working on the chatAI project" ✅ Memory recall!
```

This demonstrates:
- ✅ Persistent memory
- ✅ File system access
- ✅ Web scraping
- ✅ Multi-tool coordination

**Perfect for initial demos!**

---

## 🚀 Advanced: All 8 Tools Demo Script

Once all 8 are connected:

```
Prompt: "Here's what I need:

1. Search my GitHub repos for the chatAI project
2. Read the README file
3. Remember the key features mentioned
4. Search my Gmail for any client feedback emails
5. Scrape the latest AI news from Hacker News
6. Query my PostgreSQL database for user statistics
7. Create a project status report combining all this data
8. Save it to Google Drive
9. Post a summary to #team in Slack"
```

**This uses ALL 8 tools in one workflow!** 🎉

---

## 📞 Need Help?

- **Backend logs:** Check terminal running `npm run dev`
- **Frontend console:** F12 in browser → Console tab
- **MCP stats:** http://localhost:3001/api/mcp/stats
- **Health check:** http://localhost:3001/health

---

## 🎯 Next Steps After Demo

After your demo is successful, consider:

1. **Add More Tools:** There are 25+ pre-configured MCP servers in the system:
   - Notion, Jira, Linear (Project management)
   - MongoDB, Google Sheets (More data sources)
   - Salesforce, HubSpot (CRM)

2. **Custom Tools:** Create your own MCP server for specific needs

3. **Production Setup:**
   - Move to production OAuth credentials
   - Set up proper secret management
   - Configure rate limiting

4. **Model Optimization:** Use intelligent model routing (next optimization step)

---

**Ready to impress with your demo!** 🚀

The system is designed to make complex multi-tool AI workflows feel magical. Your audience will be amazed at how the AI seamlessly coordinates between different services.

**Good luck with the demo!** 🎉
