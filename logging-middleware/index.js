// Reusable Logging Middleware Package

const ALLOWED_STACKS = new Set(['backend', 'frontend']);
const ALLOWED_LEVELS = new Set(['debug', 'info', 'warn', 'error', 'fatal']);

const BACKEND_PACKAGES = new Set([
  'cache', 'controller', 'cron_job', 'db', 'domain', 'handler', 'repository', 'route', 'service'
]);
const FRONTEND_PACKAGES = new Set([
  'api', 'component', 'hook', 'page', 'state', 'style'
]);
const BOTH_PACKAGES = new Set([
  'auth', 'config', 'middleware', 'utils'
]);

let authToken = '';

/**
 * Configure the logger with an authorization token.
 * @param {string} token - The Bearer token for authorization.
 */
export function setAuthToken(token) {
  authToken = token;
}

/**
 * Reusable Log function to send application logs to the Test Server.
 * @param {string} stack - 'backend' or 'frontend'
 * @param {string} level - 'debug' | 'info' | 'warn' | 'error' | 'fatal'
 * @param {string} packageVal - The module/package name calling the log
 * @param {string} message - Descriptive context message
 */
export async function Log(stack, level, packageVal, message) {
  // Validate input parameters
  if (!ALLOWED_STACKS.has(stack)) {
    const errorMsg = `[Logger Error] Invalid stack: "${stack}". Must be one of: ${[...ALLOWED_STACKS].join(', ')}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  if (!ALLOWED_LEVELS.has(level)) {
    const errorMsg = `[Logger Error] Invalid level: "${level}". Must be one of: ${[...ALLOWED_LEVELS].join(', ')}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  let isValidPackage = false;
  if (stack === 'backend') {
    isValidPackage = BACKEND_PACKAGES.has(packageVal) || BOTH_PACKAGES.has(packageVal);
  } else if (stack === 'frontend') {
    isValidPackage = FRONTEND_PACKAGES.has(packageVal) || BOTH_PACKAGES.has(packageVal);
  }

  if (!isValidPackage) {
    const allowed = stack === 'backend' 
      ? [...BACKEND_PACKAGES, ...BOTH_PACKAGES]
      : [...FRONTEND_PACKAGES, ...BOTH_PACKAGES];
    const errorMsg = `[Logger Error] Invalid package: "${packageVal}" for stack: "${stack}". Allowed: ${allowed.join(', ')}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Attempt to retrieve token from environment if not set explicitly
  let finalToken = authToken;
  if (!finalToken) {
    if (typeof process !== 'undefined' && process.env) {
      finalToken = process.env.TEST_SERVER_TOKEN || process.env.VITE_TEST_SERVER_TOKEN;
    }
    if (!finalToken && typeof window !== 'undefined') {
      finalToken = window.TEST_SERVER_TOKEN;
    }
  }

  if (!finalToken || finalToken.startsWith('mock-')) {
    console.log(`[Logger Mock Log] [${stack.toUpperCase()}] [${level.toUpperCase()}] [${packageVal}] ${message}`);
    return { success: true, logID: 'mock-log-id-54321' };
  }

  const logPayload = {
    stack,
    level,
    package: packageVal,
    message
  };

  try {
    const response = await fetch('http://4.224.186.213/evaluation-service/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${finalToken}`
      },
      body: JSON.stringify(logPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[Logger Warning] Test Server returned status ${response.status}: ${errorText}`);
      return { success: false, status: response.status, error: errorText };
    }

    const responseData = await response.json();
    console.log(`[Logger Info] Log sent successfully. Log ID: ${responseData.logID}`);
    return { success: true, logID: responseData.logID };
  } catch (error) {
    console.error('[Logger Error] Failed to send log to Test Server:', error.message);
    return { success: false, error: error.message };
  }
}
