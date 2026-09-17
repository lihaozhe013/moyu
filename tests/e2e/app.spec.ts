import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { _electron as electron } from 'playwright';

const fixtureOrigin = 'http://127.0.0.1:4311';
const fixtureUrl = `${fixtureOrigin}/`;
const mainEntry = resolve('out/main/index.js');

let application: Awaited<ReturnType<typeof electron.launch>> | undefined;
let userDataPath: string | undefined;

async function readContentSnapshot(): Promise<{ url: string; bounds: Record<string, number> }> {
  if (application === undefined) {
    throw new Error('Electron application is not running.');
  }

  return application.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    const child = window?.contentView.children[0] as
      | { webContents?: { getURL: () => string }; getBounds?: () => Record<string, number> }
      | undefined;
    return {
      url: child?.webContents?.getURL() ?? '',
      bounds: child?.getBounds?.() ?? {},
    };
  });
}

async function navigateContent(url: string): Promise<void> {
  if (application === undefined) {
    throw new Error('Electron application is not running.');
  }

  await application.evaluate(({ BrowserWindow }, targetUrl) => {
    const window = BrowserWindow.getAllWindows()[0];
    const child = window?.contentView.children[0] as {
      webContents?: { loadURL: (nextUrl: string) => Promise<unknown> };
    };
    if (child?.webContents === undefined) {
      throw new Error('Content view is not available.');
    }
    void child.webContents.loadURL(targetUrl);
  }, url);
}

async function executeContent(script: string): Promise<unknown> {
  if (application === undefined) {
    throw new Error('Electron application is not running.');
  }

  return application.evaluate(({ BrowserWindow }, source) => {
    const window = BrowserWindow.getAllWindows()[0];
    const child = window?.contentView.children[0] as {
      webContents?: { executeJavaScript: (code: string) => Promise<unknown> };
    };
    if (child?.webContents === undefined) {
      throw new Error('Content view is not available.');
    }
    return child.webContents.executeJavaScript(source);
  }, script);
}

async function launchApplication(initialUrl = fixtureUrl): Promise<void> {
  userDataPath = await mkdtemp(join(tmpdir(), 'professional-canvas-e2e-'));
  application = await electron.launch({
    args: [mainEntry, `--user-data-dir=${userDataPath}`],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      APP_CONTENT_URL: initialUrl,
      APP_ALLOWED_ORIGINS: fixtureOrigin,
      APP_AUTHENTICATION_ORIGINS: '',
      APP_ENABLE_DEVTOOLS: 'false',
      APP_ALLOW_ARBITRARY_NAVIGATION: 'false',
      APP_PERSIST_SESSION: 'false',
      APP_SESSION_NAME: 'e2e',
    },
  });
  const shell = await application.firstWindow();
  await shell.waitForSelector('.app-shell');
}

test.afterEach(async () => {
  await application?.close();
  application = undefined;
  if (userDataPath !== undefined) {
    await rm(userDataPath, { recursive: true, force: true });
    userDataPath = undefined;
  }
});

test('launches a local shell with one ready content surface and no browser chrome', async () => {
  await launchApplication();
  const shell = await application!.firstWindow();

  await expect(shell.locator('.titlebar')).toBeVisible();
  await expect(shell.locator('.menubar')).toBeVisible();
  await expect(shell.locator('.toolrail')).toBeVisible();
  await expect(shell.locator('.inspector')).toBeVisible();
  await expect(shell.locator('.statusbar')).toBeVisible();
  await expect(shell.locator('.content-host')).toBeVisible();
  await expect(shell.locator('.loading-overlay')).toBeHidden({ timeout: 15_000 });
  await expect(shell.locator('.error-overlay')).toHaveCount(0);
  await expect(shell.locator('input[aria-label="Address"]')).toHaveCount(0);
  await expect(shell.locator('[role="tablist"]')).toHaveCount(0);
  await expect.poll(async () => (await readContentSnapshot()).url).toBe(fixtureUrl);
  await expect.poll(async () => (await readContentSnapshot()).bounds.width).toBeGreaterThan(0);
});

test('opens and closes the command palette through the application shortcut', async () => {
  await launchApplication();
  const shell = await application!.firstWindow();

  await shell.keyboard.press('Control+Shift+L');
  await expect(
    shell.locator('[role="dialog"][aria-labelledby="command-palette-title"]'),
  ).toBeVisible();
  await shell.keyboard.press('Escape');
  await expect(
    shell.locator('[role="dialog"][aria-labelledby="command-palette-title"]'),
  ).toHaveCount(0);
});

test('blocks a denied redirect and keeps the current trusted workspace', async () => {
  await launchApplication();
  await expect.poll(async () => (await readContentSnapshot()).url).toBe(fixtureUrl);

  await application!.evaluate(({ BrowserWindow }, url) => {
    const window = BrowserWindow.getAllWindows()[0];
    const child = window?.contentView.children[0] as {
      webContents?: { loadURL: (url: string) => void };
    };
    child?.webContents?.loadURL(url);
  }, `${fixtureOrigin}/redirect-denied`);

  await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  await expect.poll(async () => (await readContentSnapshot()).url).toBe(fixtureUrl);
});

test('keeps native content bounds aligned while the shell is resized', async () => {
  await launchApplication();
  const shell = await application!.firstWindow();

  await application!.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.setSize(1400, 900);
  });
  await expect.poll(async () => (await readContentSnapshot()).bounds.width).toBeGreaterThan(0);

  const shellBounds = await shell.locator('.content-host').boundingBox();
  const nativeBounds = (await readContentSnapshot()).bounds;
  expect(shellBounds).not.toBeNull();
  expect(nativeBounds.x).toBe(Math.round(shellBounds!.x));
  expect(nativeBounds.y).toBe(Math.round(shellBounds!.y));
  expect(nativeBounds.width).toBe(Math.round(shellBounds!.width));
  expect(nativeBounds.height).toBe(Math.round(shellBounds!.height));
});

test('supports maximize and fullscreen while preserving the prior presentation state', async () => {
  await launchApplication();

  await application!.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.maximize();
  });
  await expect
    .poll(async () =>
      application!.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.isMaximized()),
    )
    .toBe(true);

  await application!.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.setFullScreen(true);
  });
  await expect
    .poll(async () =>
      application!.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0]?.isFullScreen(),
      ),
    )
    .toBe(true);

  await application!.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.setFullScreen(false);
  });
  await expect
    .poll(async () =>
      application!.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0]?.isFullScreen(),
      ),
    )
    .toBe(false);
  await expect
    .poll(async () =>
      application!.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.isMaximized()),
    )
    .toBe(true);
});

test('denies popup creation and unsupported permissions', async () => {
  await launchApplication();
  const shell = await application!.firstWindow();

  await navigateContent(`${fixtureOrigin}/popup`);
  await expect.poll(async () => (await readContentSnapshot()).url).toBe(`${fixtureOrigin}/popup`);
  await expect
    .poll(async () =>
      executeContent(
        "document.querySelector('#open-popup').click(); document.querySelector('#result').textContent",
      ),
    )
    .toBe('denied');
  await expect
    .poll(async () =>
      application!.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length),
    )
    .toBe(1);

  await navigateContent(`${fixtureOrigin}/permission`);
  await expect
    .poll(async () => (await readContentSnapshot()).url)
    .toBe(`${fixtureOrigin}/permission`);
  await executeContent("document.querySelector('#request-permission').click()");
  await expect
    .poll(async () => executeContent("document.querySelector('#result').textContent"))
    .toBe('denied');
  await expect(shell.locator('.error-overlay')).toHaveCount(0);
});

test('reloads content and keeps zoom within the approved steps', async () => {
  await launchApplication();
  const shell = await application!.firstWindow();

  await executeContent("window.__fixtureReloadMarker = 'set'");
  await expect.poll(async () => executeContent('window.__fixtureReloadMarker')).toBe('set');
  await shell.evaluate(() => window.desktopAPI?.content.reload());
  await expect
    .poll(async () => executeContent('typeof window.__fixtureReloadMarker'))
    .toBe('undefined');

  await shell.evaluate(() => window.desktopAPI?.content.setZoomFactor(1.1));
  await expect(shell.locator('.statusbar')).toContainText('110%');
  await shell.evaluate(() => window.desktopAPI?.content.setZoomFactor(0.9));
  await expect(shell.locator('.statusbar')).toContainText('90%');
  await shell.evaluate(() => window.desktopAPI?.content.setZoomFactor(1));
  await expect(shell.locator('.statusbar')).toContainText('100%');
});

test('reports WebGL capability and exposes only non-sensitive GPU diagnostics to the shell', async () => {
  await launchApplication();
  const shell = await application!.firstWindow();

  await navigateContent(`${fixtureOrigin}/webgl`);
  await expect.poll(async () => (await readContentSnapshot()).url).toBe(`${fixtureOrigin}/webgl`);
  await expect
    .poll(async () => executeContent("document.querySelector('#result').textContent"))
    .toMatch(/^webgl-(ready|unavailable)$/);
  expect(await executeContent('typeof window.desktopAPI')).toBe('undefined');

  const diagnostics = await shell.evaluate(() =>
    window.desktopAPI?.diagnostics.getGpuDiagnostics(),
  );
  expect(diagnostics).toMatchObject({
    platform: expect.any(String),
    architecture: expect.any(String),
    electronVersion: expect.any(String),
    chromiumVersion: expect.any(String),
  });
  expect(Array.isArray(diagnostics?.scaleFactors)).toBe(true);

  await shell.keyboard.press('Control+Shift+L');
  await shell.getByRole('textbox', { name: 'Command' }).fill('gpu');
  await shell.getByRole('textbox', { name: 'Command' }).press('Enter');
  await expect(shell.locator('#gpu-title')).toBeVisible();
  await expect(shell.locator('.gpu-dialog')).toContainText('WebGL');
});

test('renders the local error overlay and recovers with Retry', async () => {
  await launchApplication(`${fixtureOrigin}/error`);
  const shell = await application!.firstWindow();

  await expect(shell.locator('.error-overlay')).toBeVisible({ timeout: 15_000 });
  await expect(shell.locator('.error-overlay')).toContainText('Unable to load workspace');

  await shell.getByRole('button', { name: 'Retry' }).click();
  await expect(shell.locator('.error-overlay')).toHaveCount(0, { timeout: 15_000 });
  await expect.poll(async () => (await readContentSnapshot()).url).toBe(`${fixtureOrigin}/error`);
});

test('keeps the shell alive after a content renderer crash and reloads it', async () => {
  await launchApplication();
  const shell = await application!.firstWindow();
  await expect.poll(async () => (await readContentSnapshot()).url).toBe(fixtureUrl);
  await expect(shell.locator('.loading-overlay')).toBeHidden({ timeout: 15_000 });

  await application!.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    const child = window?.contentView.children[0] as {
      webContents?: { forcefullyCrashRenderer: () => void };
    };
    child?.webContents?.forcefullyCrashRenderer();
  });

  await expect(shell.locator('.error-overlay')).toBeVisible({ timeout: 15_000 });
  await expect(shell.locator('.error-overlay')).toContainText('stopped unexpectedly');
  await shell.getByRole('button', { name: 'Retry' }).click();
  await expect(shell.locator('.error-overlay')).toHaveCount(0, { timeout: 15_000 });
  await expect.poll(async () => (await readContentSnapshot()).url).toBe(fixtureUrl);
});
