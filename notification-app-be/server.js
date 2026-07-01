import express from 'express';
import cors from 'cors';
import { getAccessToken, isMockMode } from './auth-manager.js';
import { Log, setAuthToken } from '../logging-middleware/index.js';
import { getTopNNotifications } from './priority-inbox.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Mock dataset mapping PDF example values
const MOCK_NOTIFICATIONS = [
  {
    "ID": "d146095a-0d86-4a34-9e69-3900a14576bc",
    "Type": "Result",
    "Message": "Mid-Sem exams grades published.",
    "Timestamp": "2026-04-22 17:51:30"
  },
  {
    "ID": "b283218f-ea5a-4b7c-93a9-1f2f240d64b0",
    "Type": "Placement",
    "Message": "CSX Corporation hiring drive registration starts today.",
    "Timestamp": "2026-04-22 17:51:18"
  },
  {
    "ID": "81589ada-0ad3-4f77-9554-f52fb558e09d",
    "Type": "Event",
    "Message": "Farewell registration link is active.",
    "Timestamp": "2026-04-22 17:51:06"
  },
  {
    "ID": "0005513a-142b-4bbc-8678-eefec65e1ede",
    "Type": "Result",
    "Message": "Project-review grades uploaded.",
    "Timestamp": "2026-04-22 17:50:54"
  },
  {
    "ID": "ea836726-c25e-4f21-a72f-544a6af8a377",
    "Type": "Result",
    "Message": "End-sem grades out for CS501.",
    "Timestamp": "2026-04-22 17:50:42"
  },
  {
    "ID": "003cb427-8fc6-47f7-bb00-be228f6b0d2c",
    "Type": "Result",
    "Message": "External evaluator schedule posted.",
    "Timestamp": "2026-04-22 17:50:30"
  },
  {
    "ID": "e5c4ff20-31bf-4d40-8f02-72fda59e8918",
    "Type": "Result",
    "Message": "Mini-project submission updated.",
    "Timestamp": "2026-04-22 17:50:18"
  },
  {
    "ID": "1cfce5ee-ad37-4894-8946-d707627176a5",
    "Type": "Event",
    "Message": "Tech-fest schedule detailed.",
    "Timestamp": "2026-04-22 17:50:06"
  },
  {
    "ID": "cf2885a6-45ac-4ba0-b548-6e9e9d4c52c8",
    "Type": "Result",
    "Message": "Theory exam re-evaluation results.",
    "Timestamp": "2026-04-22 17:49:54"
  },
  {
    "ID": "8a7412bd-6065-4d09-8501-a37f11cc848b",
    "Type": "Placement",
    "Message": "Advanced Micro Devices Inc. hiring shortlists announced.",
    "Timestamp": "2026-04-22 17:49:42"
  }
];

// Initialize credentials & token on startup
let currentToken = '';

async function initializeApp() {
  try {
    currentToken = await getAccessToken();
    setAuthToken(currentToken);
    
    // Log backend startup success
    await Log('backend', 'info', 'service', `Backend server initialized successfully. Token acquired. (MockMode: ${isMockMode})`);
  } catch (error) {
    console.error('[Backend Startup Error] Failed to fetch token:', error.message);
  }
}

// Token middleware to ensure token is valid and set
async function ensureToken(req, res, next) {
  try {
    currentToken = await getAccessToken();
    setAuthToken(currentToken);
    next();
  } catch (error) {
    await Log('backend', 'error', 'auth', `Authentication failure: ${error.message}`);
    res.status(500).json({ error: 'Failed to authenticate with Test Server', details: error.message });
  }
}

/**
 * Endpoint to retrieve token for the frontend logging middleware.
 */
app.get('/api/token', ensureToken, async (req, res) => {
  try {
    await Log('backend', 'debug', 'route', 'Token requested by frontend.');
    res.json({ token: currentToken });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Proxy for notifications from the test server.
 */
app.get('/api/notifications', ensureToken, async (req, res) => {
  const { limit, page, notification_type } = req.query;

  // Handle Mock Mode fallback
  if (isMockMode) {
    let filtered = [...MOCK_NOTIFICATIONS];
    if (notification_type && notification_type !== 'All') {
      filtered = filtered.filter(n => String(n.Type).toLowerCase() === String(notification_type).toLowerCase());
    }

    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = pageNum * limitNum;
    const paginated = filtered.slice(startIndex, endIndex);

    await Log('backend', 'info', 'route', `Mock: Successfully returned ${paginated.length} notifications`);
    return res.json({
      notifications: paginated,
      pagination: {
        total: filtered.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(filtered.length / limitNum)
      }
    });
  }

  // Build query string
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit);
  if (page) params.append('page', page);
  if (notification_type && notification_type !== 'All') {
    params.append('notification_type', notification_type);
  }

  const url = `http://4.224.186.213/evaluation-service/notifications?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${currentToken}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      await Log('backend', 'warn', 'api', `Failed fetching notifications: Test Server status ${response.status}`);
      return res.status(response.status).send(errorText);
    }

    const data = await response.json();
    await Log('backend', 'info', 'route', `Successfully fetched notifications list (Count: ${data.notifications?.length || 0})`);
    
    res.json(data);
  } catch (error) {
    await Log('backend', 'error', 'route', `Error in GET /api/notifications: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Endpoint to retrieve priority notifications (Stage 6 algorithm).
 */
app.get('/api/notifications/priority', ensureToken, async (req, res) => {
  const limit = parseInt(req.query.limit || '10', 10);
  const type = req.query.notification_type;

  // Handle Mock Mode fallback
  if (isMockMode) {
    let filtered = [...MOCK_NOTIFICATIONS];
    if (type && type !== 'All') {
      filtered = filtered.filter(n => String(n.Type).toLowerCase() === String(type).toLowerCase());
    }
    const prioritySorted = getTopNNotifications(filtered, limit);
    await Log('backend', 'info', 'route', `Mock: Successfully returned top ${limit} priority notifications`);
    return res.json({ notifications: prioritySorted });
  }

  // Fetch all notifications to apply local sorting
  let url = 'http://4.224.186.213/evaluation-service/notifications';
  if (type && type !== 'All') {
    url += `?notification_type=${type}`;
  }

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${currentToken}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      await Log('backend', 'warn', 'api', `Failed fetching priority notifications: Test Server status ${response.status}`);
      return res.status(response.status).send(errorText);
    }

    const data = await response.json();
    const notifications = data.notifications || [];

    // Apply Stage 6 Priority sorting algorithm
    const prioritySorted = getTopNNotifications(notifications, limit);
    
    await Log('backend', 'info', 'route', `Successfully returned top ${limit} priority notifications`);
    res.json({ notifications: prioritySorted });
  } catch (error) {
    await Log('backend', 'error', 'route', `Error in GET /api/notifications/priority: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, async () => {
  console.log(`[Backend Info] Server running on http://localhost:${PORT}`);
  await initializeApp();
});
