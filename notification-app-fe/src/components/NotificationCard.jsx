import { Card, CardContent, Typography, Box, IconButton, Chip, Tooltip } from "@mui/material";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import WorkIcon from "@mui/icons-material/Work";
import AssessmentIcon from "@mui/icons-material/Assessment";
import EventIcon from "@mui/icons-material/Event";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";

const getCategoryStyle = (type) => {
  const normType = String(type).toLowerCase();
  switch (normType) {
    case 'placement':
      return {
        color: '#ff4d4f', // premium red-coral
        bgColor: '#fff1f0',
        icon: <WorkIcon sx={{ color: '#ff4d4f' }} />,
        label: 'Placement'
      };
    case 'result':
      return {
        color: '#1890ff', // premium sky blue
        bgColor: '#e6f7ff',
        icon: <AssessmentIcon sx={{ color: '#1890ff' }} />,
        label: 'Result'
      };
    case 'event':
      return {
        color: '#52c41a', // premium emerald green
        bgColor: '#f6ffed',
        icon: <EventIcon sx={{ color: '#52c41a' }} />,
        label: 'Event'
      };
    default:
      return {
        color: '#722ed1', // premium violet
        bgColor: '#f9f0ff',
        icon: <NotificationsActiveIcon sx={{ color: '#722ed1' }} />,
        label: type || 'Alert'
      };
  }
};

export function NotificationCard({ notification, isRead, onMarkAsRead }) {
  const { ID, id, Type, type, Message, message, Timestamp, timestamp } = notification;
  const itemType = Type || type;
  const itemMessage = Message || message;
  const itemTimestamp = Timestamp || timestamp;
  const itemId = ID || id;

  const style = getCategoryStyle(itemType);

  // Format timestamp beautifully
  const formattedDate = itemTimestamp 
    ? new Date(itemTimestamp.replace(' ', 'T')).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Unknown date';

  return (
    <Card 
      elevation={isRead ? 0 : 2}
      sx={{ 
        borderLeft: `5px solid ${isRead ? '#d9d9d9' : style.color}`,
        backgroundColor: isRead ? '#fafafa' : '#ffffff',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: isRead ? '0 4px 12px rgba(0,0,0,0.03)' : '0 6px 16px rgba(0,0,0,0.08)',
        },
        position: 'relative',
        borderRadius: 2,
        border: '1px solid',
        borderColor: isRead ? '#e8e8e8' : '#f0f0f0',
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between">
          <Box display="flex" gap={1.5} alignItems="flex-start">
            <Box 
              sx={{ 
                backgroundColor: style.bgColor, 
                borderRadius: '50%', 
                p: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}
            >
              {style.icon}
            </Box>
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <Chip 
                  label={style.label} 
                  size="small" 
                  sx={{ 
                    backgroundColor: style.bgColor, 
                    color: style.color, 
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    height: '20px'
                  }} 
                />
                {!isRead && (
                  <Chip 
                    label="New" 
                    size="small" 
                    color="primary"
                    sx={{ 
                      fontWeight: 600, 
                      fontSize: '0.70rem',
                      height: '18px',
                      animation: 'pulse 2s infinite'
                    }} 
                  />
                )}
              </Box>
              <Typography 
                variant="body1" 
                sx={{ 
                  fontWeight: isRead ? 500 : 700, 
                  color: isRead ? 'text.secondary' : 'text.primary',
                  lineHeight: 1.4,
                  mb: 0.5
                }}
              >
                {itemMessage}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formattedDate}
              </Typography>
            </Box>
          </Box>

          {!isRead && onMarkAsRead && (
            <Tooltip title="Mark as Read">
              <IconButton 
                size="small" 
                onClick={() => onMarkAsRead(itemId)}
                sx={{ 
                  color: 'primary.main',
                  '&:hover': { backgroundColor: 'primary.light', color: '#ffffff' },
                  transition: 'all 0.2s'
                }}
              >
                <MarkEmailReadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
