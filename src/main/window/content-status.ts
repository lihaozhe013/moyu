export function isCurrentContentEvent(
  eventUrl: string,
  activeNavigationUrl: string,
  currentUrl: string,
): boolean {
  if (eventUrl.length > 0 && eventUrl !== activeNavigationUrl) {
    return false;
  }
  return currentUrl.length === 0 || currentUrl === activeNavigationUrl;
}
