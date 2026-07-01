import { createTheme, ThemeProvider, CssBaseline } from "@mui/material";
import { NotificationsPage } from "./pages/NotificationsPage";

// Define a premium and clean theme
const theme = createTheme({
  palette: {
    primary: {
      main: "#1890ff", // Sky blue
      light: "#e6f7ff",
      dark: "#096dd9",
    },
    secondary: {
      main: "#722ed1", // Violet
    },
    background: {
      default: "#f8fafc", // Very soft slate blue-gray
      paper: "#ffffff",
    },
    text: {
      primary: "#1e293b", // Slate 800
      secondary: "#64748b", // Slate 500
    },
  },
  typography: {
    fontFamily: [
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
    ].join(","),
    h4: {
      fontWeight: 800,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: "none",
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        },
      },
    },
  },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NotificationsPage />
    </ThemeProvider>
  );
}