import { readFileSync } from "fs";
import { createServer } from "http";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ZIP_PATH = join(__dirname, "..", "..", "public", "netoptima-algerie.zip");
const PORT = 3000;

const server = createServer((req, res) => {
  if (req.url === "/" || req.url === "/netoptima-algerie.zip") {
    try {
      const data = readFileSync(ZIP_PATH);
      res.writeHead(200, {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=netoptima-algerie.zip",
        "Content-Length": data.length,
        "Cache-Control": "no-cache",
      });
      res.end(data);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("File not found");
    }
  } else {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
      <html><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;background:#f8fafc">
        <div style="text-align:center">
          <h1>📦 NetOptima Algérie</h1>
          <p style="color:#64748b;margin:16px 0">Téléchargement du projet (25 MB)</p>
          <a href="/netoptima-algerie.zip" style="display:inline-block;padding:12px 32px;background:#059669;color:white;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">⬇ Télécharger le ZIP</a>
        </div>
      </body></html>
    `);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Download server on port ${PORT}`);
});
