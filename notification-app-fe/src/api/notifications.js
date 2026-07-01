const BASE_URL = 'http://localhost:3001/api';

/**
 * Fetch standard notifications from our backend server proxy.
 */
export async function fetchNotifications({ page = 1, limit = 10, type = 'All' } = {}) {
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('limit', String(limit));
  
  if (type && type !== 'All') {
    params.append('notification_type', type);
  }

  const response = await fetch(`${BASE_URL}/notifications?${params.toString()}`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to fetch notifications');
  }
  return response.json();
}

/**
 * Fetch sorted priority notifications from our backend server.
 */
export async function fetchPriorityNotifications({ limit = 10, type = 'All' } = {}) {
  const params = new URLSearchParams();
  params.append('limit', String(limit));
  
  if (type && type !== 'All') {
    params.append('notification_type', type);
  }

  const response = await fetch(`${BASE_URL}/notifications/priority?${params.toString()}`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to fetch priority notifications');
  }
  return response.json();
}

/**
 * Retrieve the active Test Server bearer token from our backend for client-side logging.
 */
export async function fetchLoggingToken() {
  const response = await fetch(`${BASE_URL}/token`);
  if (!response.ok) {
    throw new Error('Failed to fetch logging token');
  }
  const data = await response.json();
  return data.token;
}
