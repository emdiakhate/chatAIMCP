# Troubleshooting Guide

## Issue 1: Missing MCP Servers in UI

If you're not seeing all the MCP servers in the marketplace despite them being seeded in the database:

### Step 1: Verify Database Has Servers

```bash
psql -U postgres -d chataimcp -c "SELECT id, server_key, name, category FROM mcp_servers ORDER BY id;"
```

Expected output: 5 servers (filesystem, gmail, gdrive, github, memory)

### Step 2: Test API Endpoint Directly

```bash
# Get your JWT token from localStorage in browser console:
# localStorage.getItem('token')

# Test the API endpoint:
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3001/api/mcp/servers | jq '.'
```

Expected: All 5 servers should be returned with `"success": true`

### Step 3: Check Browser Console

Open your browser DevTools (F12) and look for:

1. **Network tab**: Check if `/api/mcp/servers` request succeeds
2. **Console tab**: Look for `[MCPMarketplace]` logs that show:
   - API Response with server count
   - State updated confirmation
   - Filtering information

### Step 4: Verify Token is Valid

```javascript
// In browser console:
const token = localStorage.getItem('token');
if (!token) {
  console.log('❌ No token found - please log in again');
} else {
  console.log('✅ Token exists:', token.substring(0, 20) + '...');
  // Check if token is expired
  const payload = JSON.parse(atob(token.split('.')[1]));
  const expiry = new Date(payload.exp * 1000);
  console.log('Token expires:', expiry);
  if (expiry < new Date()) {
    console.log('❌ Token is expired - please log in again');
  }
}
```

### Step 5: Check for CORS or Network Errors

In browser DevTools Network tab, check if requests to `http://localhost:3001` are:
- Succeeding (status 200)
- Not blocked by CORS
- Returning proper JSON responses

### Common Fixes:

1. **Token expired**: Log out and log in again
2. **Backend not running**: Restart with `cd backend && node src/server-mcp.js`
3. **Wrong API URL**: Check `src/lib/api.ts` has correct `API_BASE_URL`
4. **Database not seeded**: Run seeding manually:
```bash
cd backend
node -e "import('./src/config/database-pg.js').then(m => m.seedMCPServers())"
```

---

## Issue 2: Unsatisfactory Model Responses

If the AI model responses aren't helpful or not using tools effectively:

### Step 1: Verify OpenRouter Configuration

Check `.env` file has:
```
OPENROUTER_API_KEY=your-key-here
OPENROUTER_MODEL=google/gemini-2.5-pro
```

Test the API key:
```bash
curl -H "Authorization: Bearer YOUR_OPENROUTER_KEY" https://openrouter.ai/api/v1/models | jq '.data[0]'
```

### Step 2: Verify System Prompt is Being Used

The chat endpoint should include a system prompt that guides the model. Check backend logs for tool calls:

```bash
tail -f backend/server.log | grep "Chat MCP"
```

You should see log entries like:
- `[Chat MCP] Itération X: Y outils appelés`
- `[Chat MCP] Exécution: tool_name sur server_key`

### Step 3: Test Tool Calling Format

Verify tools are formatted correctly for OpenRouter/OpenAI:

```javascript
// Expected tool format:
{
  "type": "function",
  "function": {
    "name": "filesystem__read_file",
    "description": "[Local Files] Read the contents of a file",
    "parameters": {
      "type": "object",
      "properties": {
        "path": {
          "type": "string",
          "description": "Path to the file to read"
        }
      },
      "required": ["path"]
    }
  }
}
```

### Step 4: Try Different Models

Edit `.env` and try different models:

```
# Current default
OPENROUTER_MODEL=google/gemini-2.5-pro

# Alternatives to try:
# OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
# OPENROUTER_MODEL=openai/gpt-4-turbo-preview
# OPENROUTER_MODEL=meta-llama/llama-3.1-70b-instruct
```

Restart backend after changing.

### Step 5: Check Tool Execution Logs

Query the database to see if tools are being called:

```sql
SELECT
  tool_name,
  server_id,
  success,
  error_message,
  execution_time,
  created_at
FROM mcp_tool_calls
ORDER BY created_at DESC
LIMIT 10;
```

If no records: Tools aren't being called at all
If error_message not null: Tool execution is failing

### Step 6: Improve System Prompt

The system prompt in `backend/src/routes/chat-mcp.js` can be customized. Current version:
- Lists available tools
- Encourages active tool usage
- Provides guidelines for when to use each tool category

You can make it more specific for your use case.

### Common Fixes:

1. **Tools not being called**:
   - Ensure `tool_choice: 'auto'` is set in chatCompletion call
   - Verify tools array is not empty
   - Check system prompt encourages tool usage

2. **Generic responses**:
   - Model may need more explicit instructions
   - Try adding examples to system prompt
   - Use a more capable model (Claude 3.5 Sonnet)

3. **Tool execution failing**:
   - Check tool credentials (OAuth tokens for Gmail/Drive)
   - Verify filesystem paths are in allowed directories
   - Check backend logs for specific error messages

---

## Issue 3: OAuth Authentication Not Working

If Gmail, Drive, or GitHub tools fail to connect:

### For Gmail/Drive:

1. Verify `.env` has correct credentials:
```
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
```

2. Check Google Cloud Console:
   - OAuth consent screen is configured
   - Authorized redirect URIs include `http://localhost:3001/auth/google/callback`
   - Gmail API and Drive API are enabled

3. Test OAuth flow manually:
   - Click "Connect" on Gmail/Drive server in marketplace
   - Should redirect to Google login
   - After authorization, should redirect back to app

### For GitHub:

1. Create GitHub OAuth App at https://github.com/settings/developers
2. Add credentials to `.env`:
```
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=http://localhost:3001/auth/github/callback
```

---

## Getting More Help

If these steps don't resolve your issue:

1. **Check Backend Logs**: `tail -f backend/server.log`
2. **Check Browser Console**: Look for error messages
3. **Database State**: Query relevant tables to see actual data
4. **API Testing**: Use curl to test endpoints directly

For urgent issues, enable debug mode by adding to `.env`:
```
DEBUG=true
LOG_LEVEL=debug
```

Then restart the backend server.
