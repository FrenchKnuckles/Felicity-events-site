import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Theme } from '@radix-ui/themes'
import '@radix-ui/themes/styles.css'
import './index.css'
import App from './App.jsx'
import { ThemeProvider, useTheme } from './context/ThemeContext'

function ThemedApp() {
  const { appearance } = useTheme();
  return (
    <Theme appearance={appearance} accentColor="indigo" grayColor="slate" radius="medium" scaling="100%">
      <App />
    </Theme>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  </StrictMode>,
)
