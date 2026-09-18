import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { createRendererI18n } from '../../shared/i18n/react';
import App from './App';
import './styles/tokens.css';
import './styles/reset.css';
import './styles/app.css';

const i18n = createRendererI18n();
const desktopApi = window.desktopAPI;
if (desktopApi !== undefined) {
  try {
    const languageState = await desktopApi.locale.getState();
    await i18n.changeLanguage(languageState.resolved);
  } catch {
    // Falls back to the system-language guess chosen at instance creation.
  }
  desktopApi.locale.onChanged((state) => {
    void i18n.changeLanguage(state.resolved);
  });
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('The renderer root element is missing.');
}

createRoot(rootElement).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </StrictMode>,
);
