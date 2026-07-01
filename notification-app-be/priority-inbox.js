import { getAccessToken, isMockMode } from './auth-manager.js';

// Mock dataset mapping PDF example values
export const MOCK_NOTIFICATIONS = [
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

// Configuration weights
const WEIGHTS = {
  'placement': 3,
  'result': 2,
  'event': 1
};

/**
 * Returns weight of a notification type
 */
export function getNotificationWeight(type) {
  return WEIGHTS[String(type).toLowerCase()] || 0;
}

/**
 * Compares two notifications for sorting.
 * Higher priority comes first.
 * Returns negative if a > b (higher priority), positive if b > a, 0 if equal.
 */
export function compareNotifications(a, b) {
  const typeA = a.Type || a.type || '';
  const typeB = b.Type || b.type || '';
  const weightA = getNotificationWeight(typeA);
  const weightB = getNotificationWeight(typeB);

  // 1. Compare by category weight (descending)
  if (weightA !== weightB) {
    return weightB - weightA;
  }

  // 2. Compare by timestamp recency (descending)
  const timeStrA = a.Timestamp || a.timestamp || '';
  const timeStrB = b.Timestamp || b.timestamp || '';
  const timeA = Date.parse(timeStrA.replace(' ', 'T'));
  const timeB = Date.parse(timeStrB.replace(' ', 'T'));

  return timeB - timeA;
}

/**
 * Standard sorting implementation to find top N notifications.
 * Suitable for batch processing.
 */
export function getTopNNotifications(notifications, n = 10) {
  return [...notifications]
    .sort(compareNotifications)
    .slice(0, n);
}

/**
 * Efficient Min-Heap implementation to maintain top N notifications in real-time.
 * Inserting a new notification takes O(log N) instead of O(M log M).
 */
export class PriorityInbox {
  constructor(maxSize = 10) {
    this.maxSize = maxSize;
    this.heap = []; // Min-Heap of size at most maxSize
  }

  /**
   * Compare two elements in the min-heap.
   * Since this is a min-heap, we want the node with the LEAST priority at the root
   * so it can be evicted when a higher priority notification arrives.
   * Returns positive if a has LOWER priority than b.
   */
  _compareHeapElements(a, b) {
    // Invert comparison so that the minimum priority notification is at the top (root)
    return -compareNotifications(a, b);
  }

  insert(notification) {
    if (this.heap.length < this.maxSize) {
      this.heap.push(notification);
      this._upHeap(this.heap.length - 1);
    } else {
      // If the new notification has HIGHER priority than the least priority one in our heap,
      // replace the root and restore heap property.
      const root = this.heap[0];
      if (compareNotifications(notification, root) < 0) {
        this.heap[0] = notification;
        this._downHeap(0);
      }
    }
  }

  getNotifications() {
    // Return sorted from highest priority to lowest
    return [...this.heap].sort(compareNotifications);
  }

  _upHeap(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this._compareHeapElements(this.heap[index], this.heap[parent]) < 0) {
        this._swap(index, parent);
        index = parent;
      } else {
        break;
      }
    }
  }

  _downHeap(index) {
    const length = this.heap.length;
    while (index * 2 + 1 < length) {
      let left = index * 2 + 1;
      let right = index * 2 + 2;
      let smallest = left;

      if (right < length && this._compareHeapElements(this.heap[right], this.heap[left]) < 0) {
        smallest = right;
      }

      if (this._compareHeapElements(this.heap[smallest], this.heap[index]) < 0) {
        this._swap(index, smallest);
        index = smallest;
      } else {
        break;
      }
    }
  }

  _swap(i, j) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }
}

// Standalone execution script
async function run() {
  try {
    const token = await getAccessToken();

    if (isMockMode) {
      console.log('[PriorityInbox Info] Bypassing fetch (Mock Mode active). Using simulated notifications.');
      const notifications = MOCK_NOTIFICATIONS;
      console.log(`[PriorityInbox Info] Total notifications fetched: ${notifications.length}`);

      // Batch sort method
      const top10 = getTopNNotifications(notifications, 10);
      console.log('\n--- TOP 10 PRIORITY NOTIFICATIONS (Batch Sort) ---');
      top10.forEach((n, i) => {
        console.log(`${i + 1}. [${n.Type || n.type}] ${n.Message || n.message} (Timestamp: ${n.Timestamp || n.timestamp})`);
      });

      // Real-time heap method
      const inbox = new PriorityInbox(10);
      notifications.forEach(n => inbox.insert(n));
      const heapTop10 = inbox.getNotifications();
      console.log('\n--- TOP 10 PRIORITY NOTIFICATIONS (Min-Heap Insert) ---');
      heapTop10.forEach((n, i) => {
        console.log(`${i + 1}. [${n.Type || n.type}] ${n.Message || n.message} (Timestamp: ${n.Timestamp || n.timestamp})`);
      });
      return;
    }

    console.log('[PriorityInbox Info] Fetching notifications from Test Server...');
    const response = await fetch('http://4.224.186.213/evaluation-service/notifications', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[PriorityInbox Error] Fetch failed: ${response.status} - ${errorText}`);
      return;
    }

    const data = await response.json();
    const notifications = data.notifications || [];
    console.log(`[PriorityInbox Info] Total notifications fetched: ${notifications.length}`);

    // Batch sort method
    const top10 = getTopNNotifications(notifications, 10);
    console.log('\n--- TOP 10 PRIORITY NOTIFICATIONS (Batch Sort) ---');
    top10.forEach((n, i) => {
      console.log(`${i + 1}. [${n.Type || n.type}] ${n.Message || n.message} (Timestamp: ${n.Timestamp || n.timestamp})`);
    });

    // Real-time heap method
    const inbox = new PriorityInbox(10);
    notifications.forEach(n => inbox.insert(n));
    const heapTop10 = inbox.getNotifications();
    console.log('\n--- TOP 10 PRIORITY NOTIFICATIONS (Min-Heap Insert) ---');
    heapTop10.forEach((n, i) => {
      console.log(`${i + 1}. [${n.Type || n.type}] ${n.Message || n.message} (Timestamp: ${n.Timestamp || n.timestamp})`);
    });

  } catch (error) {
    console.error('[PriorityInbox Error] Standalone execution failed:', error.message);
  }
}

// Check if run directly
if (process.argv[1] && process.argv[1].endsWith('priority-inbox.js')) {
  run();
}
