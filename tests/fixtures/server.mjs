import http from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.FIXTURE_PORT ?? 4311);
const origin = `http://127.0.0.1:${port}`;
let errorAttempts = 0;
const localFixtureDirectory = join(dirname(fileURLToPath(import.meta.url)), 'local');
const localFixturePages = new Map(
  ['minimal', 'edge-to-edge', 'long-document'].map((name) => [
    `/local/${name}.html`,
    readFileSync(join(localFixtureDirectory, `${name}.html`), 'utf8'),
  ]),
);

function page(title, body, script = '') {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <style>
      :root { color-scheme: dark; font-family: system-ui, sans-serif; }
      body { margin: 0; min-height: 100vh; background: #191919; color: #f0f0f0; }
      main { display: grid; place-items: center; min-height: 100vh; gap: 12px; }
      button { padding: 8px 12px; color: inherit; background: #303030; border: 1px solid #666; border-radius: 4px; }
      canvas { width: min(70vw, 640px); height: min(55vh, 420px); border: 1px solid #666; }
      #result { min-height: 1.2em; color: #9dd8a8; }
    </style>
  </head>
  <body>
    <main>${body}</main>
    <script>${script}</script>
  </body>
</html>`;
}

function sendHtml(response, body, status = 200) {
  response.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(body);
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url ?? '/', origin);
  const localFixture = localFixturePages.get(requestUrl.pathname);
  if (localFixture !== undefined) {
    sendHtml(response, localFixture);
    return;
  }

  switch (requestUrl.pathname) {
    case '/':
      sendHtml(
        response,
        page(
          'Fixture Workspace',
          '<h1 data-fixture-ready="true">Fixture workspace ready</h1><p id="result">ready</p>',
        ),
      );
      return;
    case '/redirect-allowed':
      response.writeHead(302, { location: `${origin}/` });
      response.end();
      return;
    case '/redirect-cross-origin':
      response.writeHead(302, { location: `http://localhost:${port}/cross-origin-target` });
      response.end();
      return;
    case '/cross-origin-target':
      sendHtml(response, page('Cross Origin Target', '<h1 data-cross-origin="true">Loaded</h1>'));
      return;
    case '/popup':
      sendHtml(
        response,
        page(
          'Popup Fixture',
          '<button id="open-popup" type="button">Open popup</button><p id="result"></p>',
          `document.querySelector('#open-popup').addEventListener('click', () => {
            const popup = window.open('${origin}/popup-target', '_blank');
            document.querySelector('#result').textContent = popup === null ? 'denied' : 'opened';
          });`,
        ),
      );
      return;
    case '/popup-target':
      sendHtml(response, page('Popup Target', '<h1>Popup target</h1>'));
      return;
    case '/webgl':
      sendHtml(
        response,
        page(
          'WebGL Fixture',
          '<canvas id="webgl-canvas" width="640" height="420"></canvas><p id="result">checking</p>',
          `const canvas = document.querySelector('#webgl-canvas');
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
          const result = document.querySelector('#result');
          result.textContent = gl === null ? 'webgl-unavailable' : 'webgl-ready';
          if (gl !== null) {
            gl.clearColor(0.08, 0.08, 0.08, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
            let hue = 0;
            const render = () => {
              hue = (hue + 0.01) % 1;
              gl.clearColor(0.08 + hue * 0.1, 0.08, 0.12, 1);
              gl.clear(gl.COLOR_BUFFER_BIT);
              requestAnimationFrame(render);
            };
            requestAnimationFrame(render);
          }
          if ('gpu' in navigator) {
            navigator.gpu.requestAdapter().then((adapter) => {
              result.dataset.webgpu = adapter === null ? 'unavailable' : 'available';
            }).catch(() => { result.dataset.webgpu = 'unavailable'; });
          } else {
            result.dataset.webgpu = 'unsupported';
          }`,
        ),
      );
      return;
    case '/error':
      if (errorAttempts === 0) {
        errorAttempts += 1;
        response.destroy();
      } else {
        sendHtml(
          response,
          page('Fixture Workspace', '<h1 data-fixture-ready="true">Recovered</h1>'),
        );
      }
      return;
    case '/download':
      response.writeHead(200, {
        'content-type': 'application/octet-stream',
        'content-disposition': 'attachment; filename="fixture.txt"',
      });
      response.end('download should be denied');
      return;
    case '/permission':
      sendHtml(
        response,
        page(
          'Permission Fixture',
          '<button id="request-permission" type="button">Request permission</button><p id="result"></p>',
          `document.querySelector('#request-permission').addEventListener('click', () => {
            document.querySelector('#result').textContent = 'requested';
            navigator.geolocation.getCurrentPosition(
              () => { document.querySelector('#result').textContent = 'granted'; },
              () => { document.querySelector('#result').textContent = 'denied'; },
            );
          });`,
        ),
      );
      return;
    default:
      sendHtml(response, page('Not found', '<h1>Not found</h1>'), 404);
  }
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`fixture server listening on ${origin}\n`);
});

function closeServer() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', closeServer);
process.on('SIGTERM', closeServer);
