import { useTranslation } from 'react-i18next';

export function LoadingOverlay(): React.JSX.Element {
  const { t } = useTranslation('shell');
  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      <span className="loading-overlay__spinner" aria-hidden="true" />
      <span>{t('loading')}</span>
    </div>
  );
}
