import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.resolve(__dirname, '../config.json');

let cachedToken = '';
let tokenExpirationTime = 0;

export let isMockMode = false;

/**
 * Reads config.json file
 */
export function readConfig() {
  try {
    if (!fs.existsSync(configPath)) {
      return {
        email: "", name: "", mobileNo: "", githubUsername: "", rollNo: "", accessCode: "", clientID: "", clientSecret: ""
      };
    }
    const data = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('[AuthManager Warning] Failed to read config.json, using default empty structure:', error.message);
    return {
      email: "", name: "", mobileNo: "", githubUsername: "", rollNo: "", accessCode: "", clientID: "", clientSecret: ""
    };
  }
}

/**
 * Writes config.json file
 */
export function writeConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    console.log('[AuthManager Info] Updated config.json successfully.');
  } catch (error) {
    console.error('[AuthManager Error] Failed to write config.json:', error.message);
  }
}

/**
 * Registers with the Test Server if clientID/clientSecret are missing
 */
export async function registerIfNeeded() {
  const config = readConfig();

  // If already registered, skip
  if (config.clientID && config.clientSecret) {
    console.log('[AuthManager Info] Client already registered.');
    return config;
  }

  // Ensure necessary registration inputs are present. If not, fallback to Mock Mode.
  const required = ['email', 'name', 'mobileNo', 'githubUsername', 'rollNo', 'accessCode'];
  for (const field of required) {
    if (!config[field]) {
      console.warn(`[AuthManager Warning] Missing "${field}" in config.json. Bypassing real server registration & running in offline Mock Mode.`);
      isMockMode = true;
      return config;
    }
  }

  console.log('[AuthManager Info] Registering client with Test Server...');
  const payload = {
    email: config.email,
    name: config.name,
    mobileNo: config.mobileNo,
    githubUsername: config.githubUsername,
    rollNo: config.rollNo,
    accessCode: config.accessCode
  };

  try {
    const response = await fetch('http://4.224.186.213/evaluation-service/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Registration failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('[AuthManager Info] Registration successful. Client ID obtained:', data.clientID);

    config.clientID = data.clientID;
    config.clientSecret = data.clientSecret;
    writeConfig(config);
    return config;
  } catch (error) {
    console.error('[AuthManager Error] Registration process failed:', error.message);
    throw error;
  }
}

/**
 * Obtains an access token from the Test Server (uses cached token if valid)
 */
export async function getAccessToken() {
  // Check if cache token is still valid (with a 30 second buffer)
  const currentTime = Math.floor(Date.now() / 1000);
  if (cachedToken && currentTime < tokenExpirationTime - 30) {
    return cachedToken;
  }

  // Register first if needed
  const config = await registerIfNeeded();

  if (isMockMode) {
    console.log('[AuthManager Info] Bypassing authentication, running in Mock Mode.');
    cachedToken = 'mock-bearer-token-12345';
    tokenExpirationTime = currentTime + 86400; // 24 hours
    return cachedToken;
  }

  console.log('[AuthManager Info] Authenticating client with Test Server...');
  const payload = {
    email: config.email,
    name: config.name,
    rollNo: config.rollNo,
    accessCode: config.accessCode,
    clientID: config.clientID,
    clientSecret: config.clientSecret
  };

  try {
    const response = await fetch('http://4.224.186.213/evaluation-service/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Authentication failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    cachedToken = data.access_token;
    
    // Some API servers return expires_in as relative seconds or epoch timestamp.
    // The example screenshot page 4 shows "expires_in": 1743574344 which is a future epoch.
    // If it's a future epoch (greater than current time), use it directly.
    // Otherwise, treat it as relative seconds.
    const expiresVal = data.expires_in || data['expires-in'];
    if (expiresVal > currentTime) {
      tokenExpirationTime = expiresVal;
    } else {
      tokenExpirationTime = currentTime + expiresVal;
    }

    console.log('[AuthManager Info] Authentication successful. Token cached.');
    return cachedToken;
  } catch (error) {
    console.error('[AuthManager Error] Authentication failed:', error.message);
    throw error;
  }
}
