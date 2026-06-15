import '@codegouvfr/react-dsfr/main.css';

import { startReactDsfr } from '@codegouvfr/react-dsfr/spa';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import './styles.css';

startReactDsfr({
  defaultColorScheme: 'system',
  useLang: () => 'fr',
});

createRoot(document.getElementById('root')!).render(<App />);
