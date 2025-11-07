import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DATABASE_PATH || join(__dirname, '../../database/chatai.db');
const dbDir = dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON'); // Activer les contraintes de clé étrangère

/**
 * Initialise le schéma de la base de données SQLite avec support MCP
 */
export const initDatabase = () => {
  // Table des utilisateurs
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table des conversations
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Table des messages
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      sources TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
  `);

  // Table des intégrations (ancien système Google)
  db.exec(`
    CREATE TABLE IF NOT EXISTS integrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      provider TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at TEXT,
      scopes TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, provider),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // === TABLES MCP ===

  // Table des serveurs MCP disponibles
  db.exec(`
    CREATE TABLE IF NOT EXISTS mcp_servers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      transport_type TEXT NOT NULL CHECK(transport_type IN ('stdio', 'sse')),
      command TEXT,
      args TEXT,
      env TEXT,
      url TEXT,
      icon TEXT,
      category TEXT,
      is_public INTEGER DEFAULT 1,
      requires_auth INTEGER DEFAULT 0,
      auth_type TEXT,
      auth_provider TEXT,
      scopes TEXT,
      capabilities TEXT,
      setup_instructions TEXT,
      is_custom INTEGER DEFAULT 0,
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Table des connexions MCP par utilisateur
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_mcp_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      server_id INTEGER NOT NULL,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'disconnected', 'error')),
      credentials TEXT,
      config_overrides TEXT,
      last_connected TEXT,
      error_message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, server_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE
    );
  `);

  // Table des logs d'appels d'outils MCP
  db.exec(`
    CREATE TABLE IF NOT EXISTS mcp_tool_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      conversation_id INTEGER,
      server_id INTEGER NOT NULL,
      tool_name TEXT NOT NULL,
      parameters TEXT,
      result TEXT,
      error_message TEXT,
      execution_time INTEGER,
      success INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE
    );
  `);

  // Table des organisations (pour multi-tenancy)
  db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      plan TEXT DEFAULT 'free' CHECK(plan IN ('free', 'starter', 'professional', 'enterprise')),
      max_users INTEGER DEFAULT 5,
      settings TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table de liaison utilisateurs-organisations
  db.exec(`
    CREATE TABLE IF NOT EXISTS organization_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member')),
      joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(organization_id, user_id),
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // === INDEX POUR PERFORMANCE ===

  // Index existants
  db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);');

  // Nouveaux index MCP
  db.exec('CREATE INDEX IF NOT EXISTS idx_mcp_servers_category ON mcp_servers(category);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_mcp_servers_is_public ON mcp_servers(is_public);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_user_mcp_connections_user_id ON user_mcp_connections(user_id);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_user_mcp_connections_status ON user_mcp_connections(status);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_mcp_tool_calls_user_id ON mcp_tool_calls(user_id);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_mcp_tool_calls_conversation_id ON mcp_tool_calls(conversation_id);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_mcp_tool_calls_created_at ON mcp_tool_calls(created_at);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);');

  console.log('✅ SQLite database initialized successfully');
  console.log('✅ MCP tables created');
};

/**
 * Seed les serveurs MCP pré-configurés
 */
export const seedMCPServers = () => {
  // Vérifier si des serveurs existent déjà
  const existingServers = db.prepare('SELECT COUNT(*) as count FROM mcp_servers').get();
  if (existingServers.count > 0) {
    console.log('ℹ️  Serveurs MCP déjà présents, skip seed');
    return;
  }

  const servers = [
    {
      server_key: 'filesystem',
      name: 'Local Files',
      description: 'Accès aux fichiers et documents locaux',
      transport_type: 'stdio',
      command: 'npx',
      args: JSON.stringify(['-y', '@modelcontextprotocol/server-filesystem', process.env.FILESYSTEM_ALLOWED_PATHS || '/tmp']),
      env: JSON.stringify({}),
      icon: '📁',
      category: 'storage',
      requires_auth: 0,
      auth_type: null,
      auth_provider: null,
      scopes: null,
      capabilities: JSON.stringify(['read_file', 'write_file', 'list_directory', 'search_files'])
    },
    {
      server_key: 'gmail',
      name: 'Gmail',
      description: 'Recherche et lecture des emails Gmail',
      transport_type: 'stdio',
      command: 'node',
      args: JSON.stringify(['./mcp-servers/gmail/index.js']),
      env: JSON.stringify({}),
      icon: '📧',
      category: 'communication',
      requires_auth: 1,
      auth_type: 'oauth2',
      auth_provider: 'google',
      scopes: JSON.stringify(['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send']),
      capabilities: JSON.stringify(['search_emails', 'read_email', 'send_email', 'list_threads'])
    },
    {
      server_key: 'gdrive',
      name: 'Google Drive',
      description: 'Accès aux fichiers Google Drive',
      transport_type: 'stdio',
      command: 'npx',
      args: JSON.stringify(['-y', '@modelcontextprotocol/server-gdrive']),
      env: JSON.stringify({}),
      icon: '☁️',
      category: 'storage',
      requires_auth: 1,
      auth_type: 'oauth2',
      auth_provider: 'google',
      scopes: JSON.stringify(['https://www.googleapis.com/auth/drive.readonly']),
      capabilities: JSON.stringify(['search_files', 'read_file', 'list_files', 'get_metadata'])
    },
    {
      server_key: 'github',
      name: 'GitHub',
      description: 'Dépôts, issues et pull requests GitHub',
      transport_type: 'stdio',
      command: 'npx',
      args: JSON.stringify(['-y', '@modelcontextprotocol/server-github']),
      env: JSON.stringify({}),
      icon: '🐙',
      category: 'development',
      requires_auth: 1,
      auth_type: 'oauth2',
      auth_provider: 'github',
      scopes: JSON.stringify(['repo', 'read:user']),
      capabilities: JSON.stringify(['search_code', 'list_repos', 'read_file', 'create_issue', 'list_pull_requests'])
    },
    {
      server_key: 'memory',
      name: 'Memory',
      description: 'Mémoire persistante pour contexte long terme',
      transport_type: 'stdio',
      command: 'npx',
      args: JSON.stringify(['-y', '@modelcontextprotocol/server-memory']),
      env: JSON.stringify({}),
      icon: '🧠',
      category: 'utility',
      requires_auth: 0,
      auth_type: null,
      auth_provider: null,
      scopes: null,
      capabilities: JSON.stringify(['store_memory', 'recall_memory', 'search_memories'])
    }
  ];

  const insert = db.prepare(`
    INSERT INTO mcp_servers (
      server_key, name, description, transport_type, command, args, env,
      icon, category, requires_auth, auth_type, auth_provider, scopes, capabilities
    ) VALUES (
      @server_key, @name, @description, @transport_type, @command, @args, @env,
      @icon, @category, @requires_auth, @auth_type, @auth_provider, @scopes, @capabilities
    )
  `);

  const insertMany = db.transaction((servers) => {
    for (const server of servers) {
      insert.run(server);
    }
  });

  insertMany(servers);

  console.log(`✅ ${servers.length} serveurs MCP créés avec succès`);
};

/**
 * Helper pour exécuter des requêtes
 */
export const query = (sql, params = []) => {
  // Si c'est un SELECT
  if (sql.trim().toUpperCase().startsWith('SELECT')) {
    if (sql.includes('RETURNING')) {
      // Si c'est un INSERT/UPDATE avec RETURNING, on adapte
      const [mainQuery, returning] = sql.split('RETURNING');
      const stmt = db.prepare(mainQuery.trim());
      const result = stmt.run(params);
      // Récupérer la ligne insérée/modifiée
      const lastId = result.lastInsertRowid;
      const selectStmt = db.prepare(`SELECT * FROM (${mainQuery.replace(/INSERT INTO (\w+).*/, 'SELECT * FROM $1')}) WHERE id = ?`);
      return { rows: [selectStmt.get(lastId)] };
    }
    const stmt = db.prepare(sql);
    const rows = stmt.all(params);
    return { rows };
  }

  // Si c'est un INSERT/UPDATE/DELETE
  const stmt = db.prepare(sql);
  const result = stmt.run(params);
  return {
    rows: [],
    rowCount: result.changes,
    lastInsertRowid: result.lastInsertRowid
  };
};

export default db;
