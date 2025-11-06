import pg from 'pg';
const { Pool } = pg;

/**
 * Configuration PostgreSQL pour chatAIMCP
 * Remplace SQLite pour une meilleure scalabilité et support multi-tenant
 */

// Configuration du pool de connexions PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'chataimcp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20, // Nombre maximum de connexions dans le pool
  idleTimeoutMillis: 30000, // Fermer les connexions inactives après 30s
  connectionTimeoutMillis: 2000, // Timeout de connexion
});

// Gestion des erreurs de pool
pool.on('error', (err, client) => {
  console.error('Erreur inattendue sur un client PostgreSQL inactif', err);
});

/**
 * Initialise le schéma de la base de données
 */
export const initDatabase = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Table des utilisateurs
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Table des conversations
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Table des messages
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL,
        role VARCHAR(20) NOT NULL CHECK(role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        sources JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );
    `);

    // Table des intégrations (ancien système Google)
    await client.query(`
      CREATE TABLE IF NOT EXISTS integrations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        provider VARCHAR(50) NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        expires_at TIMESTAMP,
        scopes TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, provider),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // === NOUVELLES TABLES MCP ===

    // Table des serveurs MCP disponibles
    await client.query(`
      CREATE TABLE IF NOT EXISTS mcp_servers (
        id SERIAL PRIMARY KEY,
        server_key VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        transport_type VARCHAR(50) NOT NULL CHECK(transport_type IN ('stdio', 'sse')),
        command TEXT,
        args JSONB,
        env JSONB,
        url TEXT,
        icon VARCHAR(50),
        category VARCHAR(50),
        is_public BOOLEAN DEFAULT true,
        requires_auth BOOLEAN DEFAULT false,
        auth_type VARCHAR(50),
        auth_provider VARCHAR(50),
        scopes JSONB,
        capabilities JSONB,
        setup_instructions TEXT,
        is_custom BOOLEAN DEFAULT false,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    // Table des connexions MCP par utilisateur
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_mcp_connections (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        server_id INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'active' CHECK(status IN ('active', 'disconnected', 'error')),
        credentials JSONB,
        config_overrides JSONB,
        last_connected TIMESTAMP,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, server_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE
      );
    `);

    // Table des logs d'appels d'outils MCP
    await client.query(`
      CREATE TABLE IF NOT EXISTS mcp_tool_calls (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        conversation_id INTEGER,
        server_id INTEGER NOT NULL,
        tool_name VARCHAR(255) NOT NULL,
        parameters JSONB,
        result JSONB,
        error_message TEXT,
        execution_time INTEGER,
        success BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE
      );
    `);

    // Table des organisations (pour multi-tenancy)
    await client.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        plan VARCHAR(50) DEFAULT 'free' CHECK(plan IN ('free', 'starter', 'professional', 'enterprise')),
        max_users INTEGER DEFAULT 5,
        settings JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Table de liaison utilisateurs-organisations
    await client.query(`
      CREATE TABLE IF NOT EXISTS organization_members (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role VARCHAR(50) DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member')),
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(organization_id, user_id),
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // === INDEX POUR PERFORMANCE ===

    // Index existants
    await client.query('CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);');

    // Nouveaux index MCP
    await client.query('CREATE INDEX IF NOT EXISTS idx_mcp_servers_category ON mcp_servers(category);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_mcp_servers_is_public ON mcp_servers(is_public);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_mcp_connections_user_id ON user_mcp_connections(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_mcp_connections_status ON user_mcp_connections(status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_mcp_tool_calls_user_id ON mcp_tool_calls(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_mcp_tool_calls_conversation_id ON mcp_tool_calls(conversation_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_mcp_tool_calls_created_at ON mcp_tool_calls(created_at);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);');

    await client.query('COMMIT');

    console.log('✅ PostgreSQL database initialized successfully');
    console.log('✅ MCP tables created');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Seed les serveurs MCP pré-configurés
 */
export const seedMCPServers = async () => {
  const client = await pool.connect();

  try {
    // Vérifier si des serveurs existent déjà
    const existingServers = await client.query('SELECT COUNT(*) FROM mcp_servers');
    if (parseInt(existingServers.rows[0].count) > 0) {
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
        args: ['-y', '@modelcontextprotocol/server-filesystem', '/allowed/path'],
        icon: '📁',
        category: 'storage',
        capabilities: ['read_file', 'write_file', 'list_directory', 'search_files']
      },
      {
        server_key: 'gmail',
        name: 'Gmail',
        description: 'Recherche et lecture des emails Gmail',
        transport_type: 'stdio',
        command: 'node',
        args: ['./mcp-servers/gmail/index.js'],
        icon: '📧',
        category: 'communication',
        requires_auth: true,
        auth_type: 'oauth2',
        auth_provider: 'google',
        scopes: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'],
        capabilities: ['search_emails', 'read_email', 'send_email', 'list_threads']
      },
      {
        server_key: 'gdrive',
        name: 'Google Drive',
        description: 'Accès aux fichiers Google Drive',
        transport_type: 'stdio',
        command: 'node',
        args: ['./mcp-servers/gdrive/index.js'],
        icon: '☁️',
        category: 'storage',
        requires_auth: true,
        auth_type: 'oauth2',
        auth_provider: 'google',
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        capabilities: ['search_files', 'read_file', 'list_files', 'get_metadata']
      },
      {
        server_key: 'github',
        name: 'GitHub',
        description: 'Dépôts, issues et pull requests GitHub',
        transport_type: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        icon: '🐙',
        category: 'development',
        requires_auth: true,
        auth_type: 'oauth2',
        auth_provider: 'github',
        scopes: ['repo', 'read:org'],
        capabilities: ['search_code', 'list_repos', 'read_file', 'create_issue', 'list_pull_requests']
      },
      {
        server_key: 'memory',
        name: 'Memory',
        description: 'Mémoire persistante pour contexte long terme',
        transport_type: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-memory'],
        icon: '🧠',
        category: 'utility',
        capabilities: ['store_memory', 'recall_memory', 'search_memories']
      }
    ];

    for (const server of servers) {
      await client.query(`
        INSERT INTO mcp_servers (
          server_key, name, description, transport_type, command, args,
          icon, category, requires_auth, auth_type, auth_provider, scopes, capabilities
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        server.server_key,
        server.name,
        server.description,
        server.transport_type,
        server.command,
        JSON.stringify(server.args),
        server.icon,
        server.category,
        server.requires_auth || false,
        server.auth_type || null,
        server.auth_provider || null,
        server.scopes ? JSON.stringify(server.scopes) : null,
        JSON.stringify(server.capabilities)
      ]);
    }

    console.log(`✅ ${servers.length} serveurs MCP seedés`);

  } catch (error) {
    console.error('❌ Error seeding MCP servers:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Helper pour exécuter une requête
 */
export const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;

  if (duration > 1000) {
    console.warn(`⚠️  Requête lente (${duration}ms): ${text}`);
  }

  return res;
};

/**
 * Obtenir un client du pool pour des transactions
 */
export const getClient = () => {
  return pool.connect();
};

/**
 * Fermer le pool (pour arrêt propre)
 */
export const closePool = async () => {
  await pool.end();
  console.log('🔌 Pool PostgreSQL fermé');
};

export default pool;
