import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { createFirestoreRemote, firebaseConfigFromEnv, unconfiguredRemote } from './backlog/firebase';
import './styles/global.css';

const config = firebaseConfigFromEnv(import.meta.env);
const remote = config ? createFirestoreRemote(config) : unconfiguredRemote;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App remote={remote} />
  </StrictMode>,
);
