import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(process.env.VIDHISETU_DATA_DIR || path.resolve(__dirname, '../../data'));

const USERS_FILE = path.join(DATA_DIR, 'store_users.json');
const LAWYERS_FILE = path.join(DATA_DIR, 'store_lawyers.json');

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('[FileStore] Failed to ensure data directory:', err.message);
  }
}

/**
 * Load users from disk
 * @returns {Array<Object>}
 */
export function loadUsersFromDisk() {
  ensureDataDir();
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[FileStore] Could not read users file, starting fresh:', err.message);
  }
  return [];
}

/**
 * Persist users array or map to disk
 * @param {Array<Object>|Map<string, Object>} users
 */
export function saveUsersToDisk(users) {
  ensureDataDir();
  try {
    const list = users instanceof Map ? Array.from(users.values()) : users;
    const json = JSON.stringify(list, null, 2);
    fs.writeFileSync(USERS_FILE, json, 'utf-8');
  } catch (err) {
    console.warn('[FileStore] Failed to save users to disk:', err.message);
  }
}

/**
 * Load lawyers from disk or seed defaults
 * @param {Array<Object>} defaultSeed
 * @returns {Array<Object>}
 */
export function loadLawyersFromDisk(defaultSeed = []) {
  ensureDataDir();
  try {
    if (fs.existsSync(LAWYERS_FILE)) {
      const raw = fs.readFileSync(LAWYERS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    const defaultLawyersPath = path.resolve(__dirname, '../../data/store_lawyers.json');
    if (fs.existsSync(defaultLawyersPath)) {
      const raw = fs.readFileSync(defaultLawyersPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        saveLawyersToDisk(parsed);
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[FileStore] Could not read lawyers file:', err.message);
  }

  // Seed default lawyers if file doesn't exist yet
  if (defaultSeed && defaultSeed.length > 0) {
    saveLawyersToDisk(defaultSeed);
  }
  return defaultSeed;
}

/**
 * Persist lawyers array to disk
 * @param {Array<Object>} lawyers
 */
export function saveLawyersToDisk(lawyers) {
  ensureDataDir();
  try {
    if (Array.isArray(lawyers)) {
      const json = JSON.stringify(lawyers, null, 2);
      fs.writeFileSync(LAWYERS_FILE, json, 'utf-8');
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[FileStore] Failed to save lawyers to disk:', err.message);
    return false;
  }
}

const CONVERSATIONS_FILE = path.join(DATA_DIR, 'store_conversations.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'store_messages.json');

/**
 * Load conversations from disk
 * @returns {Array<Object>}
 */
export function loadConversationsFromDisk() {
  ensureDataDir();
  try {
    if (fs.existsSync(CONVERSATIONS_FILE)) {
      const raw = fs.readFileSync(CONVERSATIONS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[FileStore] Could not read conversations file:', err.message);
  }
  return [];
}

/**
 * Persist conversations array or map to disk
 * @param {Array<Object>|Map<string, Object>} conversations
 */
export function saveConversationsToDisk(conversations) {
  ensureDataDir();
  try {
    const list = conversations instanceof Map ? Array.from(conversations.values()) : conversations;
    const json = JSON.stringify(list, null, 2);
    fs.writeFileSync(CONVERSATIONS_FILE, json, 'utf-8');
    return true;
  } catch (err) {
    console.warn('[FileStore] Failed to save conversations to disk:', err.message);
    return false;
  }
}

/**
 * Load messages map from disk
 * @returns {Record<string, Array<Object>>}
 */
export function loadMessagesFromDisk() {
  ensureDataDir();
  try {
    if (fs.existsSync(MESSAGES_FILE)) {
      const raw = fs.readFileSync(MESSAGES_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[FileStore] Could not read messages file:', err.message);
  }
  return {};
}

/**
 * Persist messages map to disk
 * @param {Map<string, Array<Object>>|Record<string, Array<Object>>} messages
 */
export function saveMessagesToDisk(messages) {
  ensureDataDir();
  try {
    let obj = {};
    if (messages instanceof Map) {
      for (const [convId, msgList] of messages.entries()) {
        obj[convId] = msgList;
      }
    } else if (messages && typeof messages === 'object') {
      obj = messages;
    }
    const json = JSON.stringify(obj, null, 2);
    fs.writeFileSync(MESSAGES_FILE, json, 'utf-8');
    return true;
  } catch (err) {
    console.warn('[FileStore] Failed to save messages to disk:', err.message);
    return false;
  }
}

export default {
  loadUsersFromDisk,
  saveUsersToDisk,
  loadLawyersFromDisk,
  saveLawyersToDisk,
  loadConversationsFromDisk,
  saveConversationsToDisk,
  loadMessagesFromDisk,
  saveMessagesToDisk,
};
