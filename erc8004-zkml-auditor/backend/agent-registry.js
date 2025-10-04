/**
 * Agent Registry - Simple JSON file-based storage
 *
 * In production, migrate to PostgreSQL/MongoDB
 * For MVP, JSON file is sufficient for < 1000 agents
 */

const fs = require('fs').promises;
const path = require('path');

const REGISTRY_FILE = path.join(__dirname, '../data/agents.json');

// Ensure data directory exists
async function ensureDataDir() {
  const dataDir = path.join(__dirname, '../data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

/**
 * Load registry from disk
 */
async function loadRegistry() {
  await ensureDataDir();

  try {
    const data = await fs.readFile(REGISTRY_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist yet, create empty registry
      const emptyRegistry = {
        agents: [],
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      };
      await saveRegistry(emptyRegistry);
      return emptyRegistry;
    }
    throw error;
  }
}

/**
 * Save registry to disk
 */
async function saveRegistry(registry) {
  await ensureDataDir();

  registry.lastUpdated = new Date().toISOString();
  await fs.writeFile(REGISTRY_FILE, JSON.stringify(registry, null, 2));
}

/**
 * Register a new verified agent
 *
 * @param {Object} agent - Agent registration data
 * @param {string} agent.modelHash - Unique model hash (primary key)
 * @param {string} agent.agentName
 * @param {string} agent.agentDescription
 * @param {string} agent.verificationId
 * @param {string} agent.proofHash
 * @param {string} agent.proofSystem
 * @param {number} agent.testCasesPassed
 * @param {Object} agent.metadata
 * @param {Object} agent.performance
 * @param {Array} agent.testResults
 * @param {boolean} agent.simulated
 * @param {string} agent.verifiedAt - ISO timestamp
 */
async function registerAgent(agent) {
  const registry = await loadRegistry();

  // Check if agent already exists (by model hash)
  const existingIndex = registry.agents.findIndex(a => a.modelHash === agent.modelHash);

  if (existingIndex >= 0) {
    // Update existing agent (re-verification)
    registry.agents[existingIndex] = {
      ...registry.agents[existingIndex],
      ...agent,
      updatedAt: new Date().toISOString(),
      verificationCount: (registry.agents[existingIndex].verificationCount || 1) + 1
    };
  } else {
    // Add new agent
    registry.agents.push({
      ...agent,
      createdAt: new Date().toISOString(),
      verificationCount: 1,
      usageCount: 0 // For future marketplace metrics
    });
  }

  await saveRegistry(registry);

  return {
    success: true,
    modelHash: agent.modelHash,
    isUpdate: existingIndex >= 0
  };
}

/**
 * Get all verified agents
 *
 * @param {Object} options - Query options
 * @param {number} options.limit - Max results (default: 50)
 * @param {number} options.offset - Pagination offset (default: 0)
 * @param {string} options.sortBy - Sort field (default: 'verifiedAt')
 * @param {string} options.order - 'asc' or 'desc' (default: 'desc')
 * @param {string} options.search - Search query (matches name/description)
 */
async function getAgents(options = {}) {
  const {
    limit = 50,
    offset = 0,
    sortBy = 'verifiedAt',
    order = 'desc',
    search = ''
  } = options;

  const registry = await loadRegistry();
  let agents = [...registry.agents];

  // Search filter
  if (search) {
    const query = search.toLowerCase();
    agents = agents.filter(agent =>
      agent.agentName.toLowerCase().includes(query) ||
      (agent.agentDescription && agent.agentDescription.toLowerCase().includes(query))
    );
  }

  // Sort
  agents.sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];

    if (order === 'desc') {
      return bVal > aVal ? 1 : -1;
    } else {
      return aVal > bVal ? 1 : -1;
    }
  });

  // Paginate
  const paginatedAgents = agents.slice(offset, offset + limit);

  return {
    agents: paginatedAgents,
    total: agents.length,
    limit,
    offset,
    hasMore: offset + limit < agents.length
  };
}

/**
 * Get agent by model hash
 *
 * @param {string} modelHash - Model hash (0x...)
 */
async function getAgentByHash(modelHash) {
  const registry = await loadRegistry();
  const agent = registry.agents.find(a => a.modelHash === modelHash);

  if (!agent) {
    return null;
  }

  return agent;
}

/**
 * Increment agent usage count (for marketplace metrics)
 *
 * @param {string} modelHash
 */
async function incrementUsageCount(modelHash) {
  const registry = await loadRegistry();
  const agent = registry.agents.find(a => a.modelHash === modelHash);

  if (agent) {
    agent.usageCount = (agent.usageCount || 0) + 1;
    agent.lastUsed = new Date().toISOString();
    await saveRegistry(registry);
  }
}

/**
 * Get registry stats
 */
async function getStats() {
  const registry = await loadRegistry();

  return {
    totalAgents: registry.agents.length,
    lastUpdated: registry.lastUpdated,
    recentAgents: registry.agents
      .sort((a, b) => new Date(b.verifiedAt) - new Date(a.verifiedAt))
      .slice(0, 5)
      .map(a => ({
        modelHash: a.modelHash,
        agentName: a.agentName,
        verifiedAt: a.verifiedAt
      }))
  };
}

module.exports = {
  registerAgent,
  getAgents,
  getAgentByHash,
  incrementUsageCount,
  getStats
};
