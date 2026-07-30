import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the start screen", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Hello World<\/title>/i);
  assert.match(html, /<h1>Welcome<\/h1>/);
  assert.match(html, /Press the button below to begin\./);
  assert.match(html, /<button[^>]*>Start<\/button>/);
  assert.match(html, /aria-live="polite"/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("the Start and Reset buttons toggle Hello World", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /const \[started, setStarted\] = useState\(false\)/);
  assert.match(page, /onClick=\{\(\) => setStarted\(true\)\}/);
  assert.match(page, /onClick=\{\(\) => setStarted\(false\)\}/);
  assert.match(page, /started \? "Hello World" : "Welcome"/);
  assert.match(page, />\s*Reset\s*<\/button>/);
  assert.match(layout, /title:\s*"Hello World"/);
  assert.doesNotMatch(page, /codex-preview|_sites-preview/i);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
