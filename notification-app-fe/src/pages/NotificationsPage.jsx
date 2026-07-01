import { useState } from "react";
import {
  Alert,
  Badge,
  Box,
  CircularProgress,
  Divider,
  Pagination,
  Stack,
  Typography,
  Tabs,
  Tab,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import InboxIcon from "@mui/icons-material/Inbox";

import { NotificationCard } from "../components/NotificationCard";
import { NotificationFilter } from "../components/NotificationFilter";
import { useNotifications } from "../hooks/useNotifications";

export function NotificationsPage() {
  const [activeTab, setActiveTab] = useState(0); // 0 = All, 1 = Priority Inbox
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [priorityLimit, setPriorityLimit] = useState(10);

  const isPriority = activeTab === 1;

  const {
    notifications,
    totalPages,
    loading,
    error,
    readIds,
    markAsRead,
    markAllAsRead,
    clearReadHistory
  } = useNotifications({
    page,
    limit: isPriority ? priorityLimit : 10,
    type: filter,
    isPriority
  });

  // Calculate unread count on the currently displayed list
  const unreadCount = notifications.filter(
    (n) => !readIds.includes(n.ID || n.id)
  ).length;

  const handleTabChange = (_, newValue) => {
    setActiveTab(newValue);
    setPage(1); // reset to page 1
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPage(1); // reset to page 1
  };

  const handlePageChange = (_, newPage) => {
    setPage(newPage);
  };

  const handleLimitChange = (event) => {
    setPriorityLimit(event.target.value);
  };

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", px: 2, py: 4 }}>
      {/* Header section */}
      <Stack 
        direction={{ xs: "column", sm: "row" }} 
        alignItems={{ xs: "flex-start", sm: "center" }} 
        justifyContent="space-between" 
        spacing={2} 
        mb={3}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <NotificationsIcon sx={{ fontSize: 32, color: "primary.main" }} />
          </Badge>
          <Box>
            <Typography variant="h4" fontWeight={800} letterSpacing="-0.5px">
              Campus Notifications
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Real-time placements, exams, and event announcements
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DoneAllIcon />}
            onClick={markAllAsRead}
            disabled={notifications.length === 0 || unreadCount === 0}
            sx={{ borderRadius: 2, textTransform: "none" }}
          >
            Mark Page Read
          </Button>
          <Button
            variant="text"
            color="secondary"
            size="small"
            startIcon={<DeleteSweepIcon />}
            onClick={clearReadHistory}
            disabled={readIds.length === 0}
            sx={{ borderRadius: 2, textTransform: "none" }}
          >
            Reset History
          </Button>
        </Stack>
      </Stack>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          aria-label="notification-tabs"
          variant="fullWidth"
        >
          <Tab 
            icon={<NotificationsIcon fontSize="small" />} 
            iconPosition="start" 
            label="All Announcements" 
            sx={{ textTransform: "none", fontWeight: 700 }}
          />
          <Tab 
            icon={<InboxIcon fontSize="small" />} 
            iconPosition="start" 
            label="Priority Inbox (Top N)" 
            sx={{ textTransform: "none", fontWeight: 700 }}
          />
        </Tabs>
      </Box>

      {/* Filters and Priority limits row */}
      <Stack 
        direction={{ xs: "column", sm: "row" }} 
        justifyContent="space-between" 
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={2} 
        mb={3}
      >
        <Box>
          <NotificationFilter value={filter} onChange={handleFilterChange} />
        </Box>

        {isPriority && (
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="priority-limit-select-label">Show Top</InputLabel>
            <Select
              labelId="priority-limit-select-label"
              id="priority-limit-select"
              value={priorityLimit}
              label="Show Top"
              onChange={handleLimitChange}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value={5}>Top 5</MenuItem>
              <MenuItem value={10}>Top 10</MenuItem>
              <MenuItem value={15}>Top 15</MenuItem>
              <MenuItem value={20}>Top 20</MenuItem>
            </Select>
          </FormControl>
        )}
      </Stack>

      {/* Content display states */}
      {loading && (
        <Box display="flex" justifyContent="center" py={12}>
          <CircularProgress size={48} thickness={4} />
        </Box>
      )}

      {!loading && error && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Failed to load notifications: {error}. Make sure the backend server (port 3001) is running and config.json is valid.
        </Alert>
      )}

      {!loading && !error && notifications.length === 0 && (
        <Card variant="outlined" sx={{ borderRadius: 2, py: 6, textAlign: "center", backgroundColor: '#fafafa' }}>
          <CardContent>
            <InboxIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
            <Typography variant="h6" color="text.secondary" fontWeight={600}>
              Inbox is clean!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No {filter !== 'All' ? filter.toLowerCase() : ''} notifications found.
            </Typography>
          </CardContent>
        </Card>
      )}

      {!loading && !error && notifications.length > 0 && (
        <Stack spacing={2}>
          {notifications.map((n) => {
            const id = n.ID || n.id;
            return (
              <NotificationCard
                key={id}
                notification={n}
                isRead={readIds.includes(id)}
                onMarkAsRead={markAsRead}
              />
            );
          })}
        </Stack>
      )}

      {/* Pagination (only for All announcements, since Priority is top-N) */}
      {!loading && !isPriority && totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={4}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            shape="rounded"
            size="medium"
          />
        </Box>
      )}
    </Box>
  );
}
