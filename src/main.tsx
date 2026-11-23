import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './theme/generated/tokens.css';
import './theme/tailwind.css';
import './styles.css';
import { TooltipGroup } from './components/ui/tooltip';
import { ThemeProvider } from './theme/ThemeProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <TooltipGroup>
        <App />
      </TooltipGroup>
    </ThemeProvider>
  </StrictMode>,
);
