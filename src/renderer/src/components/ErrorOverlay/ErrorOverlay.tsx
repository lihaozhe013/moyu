import { useTranslation } from 'react-i18next';

interface ErrorOverlayProps {
  readonly title?: string;
  readonly description?: string;
  readonly errorCode?: number;
}

export function ErrorOverlay({
  title,
  description,
  errorCode,
}: ErrorOverlayProps): React.JSX.Element {
  const { t } = useTranslation('errors');
  return (
    <div className="error-overlay" role="alert">
      <div className="error-overlay__icon" aria-hidden="true">
        !
      </div>
      <h2>{title ?? t('loadFailedTitle')}</h2>
      <p>{description ?? t('loadFailedDescription')}</p>
      {errorCode === undefined ? null : <span>{t('errorCode', { code: errorCode })}</span>}
      <span className="error-overlay__hint">{t('reloadHint')}</span>
    </div>
  );
}
