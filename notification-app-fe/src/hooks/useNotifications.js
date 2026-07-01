import { useState, useEffect } from "react";
import { fetchNotifications, fetchPriorityNotifications, fetchLoggingToken } from "../api/notifications";
import { Log, setAuthToken } from "../../../logging-middleware/index.js";

export function useNotifications({ page = 1, limit = 10, type = 'All', isPriority = false } = {}) {
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Track read notification IDs in localStorage
  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem('read_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Fetch token and configure logger once on mount
  useEffect(() => {
    const initLogger = async () => {
      try {
        const token = await fetchLoggingToken();
        setAuthToken(token);
        await Log('frontend', 'info', 'auth', 'Frontend logging initialized successfully.');
      } catch (err) {
        console.error('Failed to initialize logging in hook:', err.message);
      }
    };
    initLogger();
  }, []);

  // Save readIds to localStorage
  useEffect(() => {
    localStorage.setItem('read_notifications', JSON.stringify(readIds));
  }, [readIds]);

  // Fetch data
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let data;
        if (isPriority) {
          data = await fetchPriorityNotifications({ limit, type });
          if (active) {
            setNotifications(data.notifications || []);
            setTotal(data.notifications?.length || 0);
            setTotalPages(1);
            
            // Log priority load via middleware
            await Log('frontend', 'info', 'page', `Loaded priority inbox (Filter: ${type}, Limit: ${limit})`);
          }
        } else {
          data = await fetchNotifications({ page, limit, type });
          if (active) {
            setNotifications(data.notifications || []);
            setTotal(data.pagination?.total || 0);
            setTotalPages(data.pagination?.totalPages || 0);
            
            // Log standard load via middleware
            await Log('frontend', 'info', 'page', `Loaded notifications page ${page} (Filter: ${type})`);
          }
        }
      } catch (err) {
        if (active) {
          setError(err.message);
          setNotifications([]);
          // Log error via middleware
          await Log('frontend', 'error', 'api', `Failed loading notifications: ${err.message}`);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [page, limit, type, isPriority]);

  const markAsRead = async (id) => {
    if (!readIds.includes(id)) {
      const updated = [...readIds, id];
      setReadIds(updated);
      // Log marking read via middleware
      await Log('frontend', 'info', 'component', `Notification marked as read: ${id}`);
    }
  };

  const markAllAsRead = async () => {
    const newIds = notifications
      .map(n => n.ID || n.id)
      .filter(id => id && !readIds.includes(id));
      
    if (newIds.length > 0) {
      const updated = [...readIds, ...newIds];
      setReadIds(updated);
      // Log marking all read via middleware
      await Log('frontend', 'info', 'component', `Marked ${newIds.length} notifications as read.`);
    }
  };

  const clearReadHistory = async () => {
    setReadIds([]);
    // Log resetting history via middleware
    await Log('frontend', 'info', 'component', `Cleared read history.`);
  };

  return { 
    notifications, 
    total, 
    totalPages, 
    loading, 
    error, 
    readIds, 
    markAsRead, 
    markAllAsRead,
    clearReadHistory
  };
}
