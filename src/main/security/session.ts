import { session, type Session, type WebContents } from 'electron';
import type { AppConfig } from '../../shared/types';
import type { Logger } from '../app/logger';
import { installDownloadPolicy } from './downloads';
import { installPermissionPolicy } from './permissions';

export function createContentSession(config: AppConfig): Session {
  return session.fromPartition(config.session.partition, { cache: true });
}

export function configureContentSession(
  contentSession: Session,
  contentWebContents: WebContents,
  logger: Logger,
): () => void {
  const removePermissionPolicy = installPermissionPolicy(
    contentSession,
    contentWebContents,
    logger,
  );
  const removeDownloadPolicy = installDownloadPolicy(contentSession, logger);

  return () => {
    removePermissionPolicy();
    removeDownloadPolicy();
  };
}
