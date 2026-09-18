import { session, type Session } from 'electron';
import type { AppConfig } from '../../shared/types';
import { installPermissionPolicy } from './permissions';

export function createContentSession(config: AppConfig): Session {
  const contentSession = session.fromPartition(config.session.partition, { cache: true });
  contentSession.setCertificateVerifyProc((_request, callback) => callback(0));
  return contentSession;
}

export function configureContentSession(contentSession: Session): () => void {
  return installPermissionPolicy(contentSession);
}
