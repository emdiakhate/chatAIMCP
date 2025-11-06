/**
 * MCP Server Registry - Catalogue des serveurs MCP disponibles
 *
 * Ce module gère la configuration des serveurs MCP pré-configurés
 * et permet aux entreprises d'ajouter leurs propres serveurs personnalisés.
 */

/**
 * Serveurs MCP pré-configurés pour les cas d'usage courants
 */
export const BUILTIN_SERVERS = {
  // Système de fichiers local
  filesystem: {
    id: 'filesystem',
    name: 'Local Files',
    description: 'Accès aux fichiers et documents locaux',
    transport_type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/allowed/path'],
    icon: '📁',
    category: 'storage',
    isPublic: true,
    capabilities: ['read_file', 'write_file', 'list_directory', 'search_files'],
    setupInstructions: 'Spécifiez les dossiers auxquels vous souhaitez donner accès'
  },

  // Gmail
  gmail: {
    id: 'gmail',
    name: 'Gmail',
    description: 'Recherche et lecture des emails Gmail',
    transport_type: 'stdio',
    command: 'node',
    args: ['./mcp-servers/gmail/index.js'],
    icon: '📧',
    category: 'communication',
    isPublic: true,
    requiresAuth: true,
    authType: 'oauth2',
    authProvider: 'google',
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send'
    ],
    capabilities: ['search_emails', 'read_email', 'send_email', 'list_threads'],
    setupInstructions: 'Connectez votre compte Google pour accéder à Gmail'
  },

  // Google Drive
  gdrive: {
    id: 'gdrive',
    name: 'Google Drive',
    description: 'Accès aux fichiers Google Drive',
    transport_type: 'stdio',
    command: 'node',
    args: ['./mcp-servers/gdrive/index.js'],
    icon: '☁️',
    category: 'storage',
    isPublic: true,
    requiresAuth: true,
    authType: 'oauth2',
    authProvider: 'google',
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly'
    ],
    capabilities: ['search_files', 'read_file', 'list_files', 'get_metadata'],
    setupInstructions: 'Connectez votre compte Google pour accéder à Drive'
  },

  // Outlook / Microsoft 365
  outlook: {
    id: 'outlook',
    name: 'Outlook',
    description: 'Emails et calendrier Outlook/Microsoft 365',
    transport_type: 'stdio',
    command: 'node',
    args: ['./mcp-servers/outlook/index.js'],
    icon: '📮',
    category: 'communication',
    isPublic: true,
    requiresAuth: true,
    authType: 'oauth2',
    authProvider: 'microsoft',
    scopes: [
      'Mail.Read',
      'Mail.Send',
      'Calendars.Read'
    ],
    capabilities: ['search_emails', 'read_email', 'send_email', 'list_events', 'create_event'],
    setupInstructions: 'Connectez votre compte Microsoft pour accéder à Outlook'
  },

  // OneDrive
  onedrive: {
    id: 'onedrive',
    name: 'OneDrive',
    description: 'Accès aux fichiers OneDrive',
    transport_type: 'stdio',
    command: 'node',
    args: ['./mcp-servers/onedrive/index.js'],
    icon: '☁️',
    category: 'storage',
    isPublic: true,
    requiresAuth: true,
    authType: 'oauth2',
    authProvider: 'microsoft',
    scopes: [
      'Files.Read',
      'Files.Read.All'
    ],
    capabilities: ['search_files', 'read_file', 'list_files'],
    setupInstructions: 'Connectez votre compte Microsoft pour accéder à OneDrive'
  },

  // Notion
  notion: {
    id: 'notion',
    name: 'Notion',
    description: 'Accès aux pages et bases de données Notion',
    transport_type: 'stdio',
    command: 'node',
    args: ['./mcp-servers/notion/index.js'],
    icon: '📝',
    category: 'productivity',
    isPublic: true,
    requiresAuth: true,
    authType: 'api_key',
    capabilities: ['search_pages', 'read_page', 'query_database', 'create_page'],
    setupInstructions: 'Obtenez votre clé API Notion depuis https://www.notion.so/my-integrations'
  },

  // Slack
  slack: {
    id: 'slack',
    name: 'Slack',
    description: 'Messages et canaux Slack',
    transport_type: 'stdio',
    command: 'node',
    args: ['./mcp-servers/slack/index.js'],
    icon: '💬',
    category: 'communication',
    isPublic: true,
    requiresAuth: true,
    authType: 'oauth2',
    authProvider: 'slack',
    scopes: [
      'channels:read',
      'channels:history',
      'chat:write',
      'users:read'
    ],
    capabilities: ['search_messages', 'send_message', 'list_channels', 'read_channel'],
    setupInstructions: 'Connectez votre workspace Slack'
  },

  // GitHub
  github: {
    id: 'github',
    name: 'GitHub',
    description: 'Dépôts, issues et pull requests GitHub',
    transport_type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    icon: '🐙',
    category: 'development',
    isPublic: true,
    requiresAuth: true,
    authType: 'oauth2',
    authProvider: 'github',
    scopes: ['repo', 'read:org'],
    capabilities: ['search_code', 'list_repos', 'read_file', 'create_issue', 'list_pull_requests'],
    setupInstructions: 'Connectez votre compte GitHub'
  },

  // PostgreSQL
  postgres: {
    id: 'postgres',
    name: 'PostgreSQL',
    description: 'Requêtes sur base de données PostgreSQL',
    transport_type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
    icon: '🐘',
    category: 'database',
    isPublic: true,
    requiresAuth: true,
    authType: 'credentials',
    capabilities: ['query', 'list_tables', 'describe_table', 'execute_query'],
    setupInstructions: 'Fournissez l\'URL de connexion PostgreSQL'
  },

  // Memory (contexte persistant)
  memory: {
    id: 'memory',
    name: 'Memory',
    description: 'Mémoire persistante pour contexte long terme',
    transport_type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    icon: '🧠',
    category: 'utility',
    isPublic: true,
    requiresAuth: false,
    capabilities: ['store_memory', 'recall_memory', 'search_memories'],
    setupInstructions: 'Aucune configuration requise'
  },

  // Brave Search
  brave_search: {
    id: 'brave_search',
    name: 'Brave Search',
    description: 'Recherche web via Brave Search API',
    transport_type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    icon: '🔍',
    category: 'search',
    isPublic: true,
    requiresAuth: true,
    authType: 'api_key',
    capabilities: ['web_search', 'local_search', 'news_search'],
    setupInstructions: 'Obtenez votre clé API depuis https://brave.com/search/api/'
  },

  // Puppeteer (web scraping)
  puppeteer: {
    id: 'puppeteer',
    name: 'Web Browser',
    description: 'Navigation et scraping web automatisé',
    transport_type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-puppeteer'],
    icon: '🌐',
    category: 'utility',
    isPublic: true,
    requiresAuth: false,
    capabilities: ['navigate', 'screenshot', 'extract_text', 'click', 'fill_form'],
    setupInstructions: 'Aucune configuration requise'
  }
};

/**
 * Catégories de serveurs MCP
 */
export const CATEGORIES = {
  storage: { name: 'Stockage', icon: '📦', color: '#3B82F6' },
  communication: { name: 'Communication', icon: '💬', color: '#10B981' },
  productivity: { name: 'Productivité', icon: '⚡', color: '#F59E0B' },
  development: { name: 'Développement', icon: '💻', color: '#8B5CF6' },
  database: { name: 'Base de données', icon: '🗄️', color: '#EF4444' },
  search: { name: 'Recherche', icon: '🔎', color: '#6366F1' },
  utility: { name: 'Utilitaire', icon: '🔧', color: '#84CC16' }
};

/**
 * Classe pour gérer le registre de serveurs
 */
class ServerRegistry {
  constructor() {
    this.customServers = new Map();
  }

  /**
   * Récupère tous les serveurs disponibles
   * @param {boolean} includeCustom - Inclure les serveurs personnalisés
   * @returns {Array} - Liste des serveurs
   */
  getAllServers(includeCustom = true) {
    const builtinList = Object.values(BUILTIN_SERVERS);

    if (!includeCustom) {
      return builtinList;
    }

    const customList = Array.from(this.customServers.values());
    return [...builtinList, ...customList];
  }

  /**
   * Récupère un serveur par son ID
   * @param {string} serverId - ID du serveur
   * @returns {Object|null} - Configuration du serveur
   */
  getServer(serverId) {
    if (BUILTIN_SERVERS[serverId]) {
      return BUILTIN_SERVERS[serverId];
    }
    return this.customServers.get(serverId) || null;
  }

  /**
   * Récupère les serveurs par catégorie
   * @param {string} category - Catégorie
   * @returns {Array} - Liste des serveurs
   */
  getServersByCategory(category) {
    return this.getAllServers().filter(server => server.category === category);
  }

  /**
   * Ajoute un serveur personnalisé
   * @param {Object} serverConfig - Configuration du serveur
   * @returns {Object} - Serveur ajouté
   */
  addCustomServer(serverConfig) {
    const server = {
      ...serverConfig,
      isPublic: false,
      isCustom: true,
      createdAt: new Date().toISOString()
    };

    this.customServers.set(server.id, server);
    return server;
  }

  /**
   * Supprime un serveur personnalisé
   * @param {string} serverId - ID du serveur
   * @returns {boolean} - Succès
   */
  removeCustomServer(serverId) {
    return this.customServers.delete(serverId);
  }

  /**
   * Recherche des serveurs par nom ou description
   * @param {string} query - Requête de recherche
   * @returns {Array} - Serveurs correspondants
   */
  searchServers(query) {
    const lowerQuery = query.toLowerCase();

    return this.getAllServers().filter(server => {
      return (
        server.name.toLowerCase().includes(lowerQuery) ||
        server.description.toLowerCase().includes(lowerQuery) ||
        server.capabilities.some(cap => cap.toLowerCase().includes(lowerQuery))
      );
    });
  }

  /**
   * Vérifie si un serveur nécessite une authentification
   * @param {string} serverId - ID du serveur
   * @returns {boolean}
   */
  requiresAuth(serverId) {
    const server = this.getServer(serverId);
    return server ? server.requiresAuth === true : false;
  }

  /**
   * Récupère le type d'authentification d'un serveur
   * @param {string} serverId - ID du serveur
   * @returns {string|null} - Type d'auth ou null
   */
  getAuthType(serverId) {
    const server = this.getServer(serverId);
    return server?.authType || null;
  }
}

// Instance singleton
const serverRegistry = new ServerRegistry();

export default serverRegistry;
