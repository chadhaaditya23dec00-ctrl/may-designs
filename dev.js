#!/usr/bin/env node
/* ============================================================
   DEV SERVER
   ------------------------------------------------------------
   Serves the project on http://localhost:5173 and rebuilds
   whenever anything in src/ changes. No dependencies.

   Use a server rather than opening index.html directly when you
   want to test the cart: localStorage is unreliable on file://
   in some browsers.
   ============================================================ */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = __dirname;
const PORT = Number(process.env.PORT) || 5173;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function build(reason){
  try {
    const out = execFileSync(process.execPath, [path.join(root, "build.js")], { encoding: "utf8" });
    process.stdout.write(`${new Date().toLocaleTimeString()}  ${reason}\n${out}`);
  } catch (err) {
    process.stdout.write(`${new Date().toLocaleTimeString()}  build failed\n${err.stdout || ""}${err.stderr || ""}`);
  }
}

build("initial build");

/* rebuild on change, debounced — editors often fire several events per save */
let pending = null;
fs.watch(path.join(root, "src"), { recursive: true }, (_e, file) => {
  clearTimeout(pending);
  pending = setTimeout(() => build(`changed ${file}`), 60);
});

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split("?")[0]);
  if (rel === "/") rel = "/index.html";

  // keep requests inside the project directory
  const file = path.join(root, path.normalize(rel).replace(/^([/\\])+/, ""));
  if (!file.startsWith(root)) { res.writeHead(403).end("Forbidden"); return; }

  fs.readFile(file, (err, body) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found"); return; }
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(body);
  });
}).listen(PORT, () => {
  console.log(`\n  MAY DESIGNS dev server`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  http://localhost:${PORT}/?edit   (editor)\n`);
  console.log(`  watching src/ — Ctrl+C to stop\n`);
});
