import type { WebContentsView } from 'electron';
import { roundContentBounds } from '../../shared/geometry';
import type { ContentBounds, NativeContentBounds } from '../../shared/types';

export function applyContentBounds(
  contentView: WebContentsView,
  bounds: ContentBounds,
): NativeContentBounds {
  const nativeBounds = roundContentBounds(bounds);
  contentView.setBounds(nativeBounds);
  return nativeBounds;
}
