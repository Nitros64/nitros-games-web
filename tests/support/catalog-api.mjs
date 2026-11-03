import { handleAdminFixture } from "./admin-fixture.mjs";
import { createServer } from "node:http";

// Test-only HTTP server: exercises server-side fetch without altering Spring Boot.
let scenario = { body: [] };
createServer(async (request, response) => {
  if (await handleAdminFixture(request, response)) return;
  if (request.url === "/health") { response.end("ok"); return; }
  if (request.url === "/scenario" && request.method === "POST") {
    let body = "";
    for await (const chunk of request) body += chunk;
    scenario = JSON.parse(body);
    response.end("ok");
    return;
  }
  if (request.url !== "/api/v1/games" || request.method !== "GET") {
    response.writeHead(404).end(); return;
  }
  const current = scenario;
  if (current.disconnect) { request.socket.destroy(); return; }
  if (current.delay) await new Promise(resolve => setTimeout(resolve, current.delay));
  response.writeHead(current.status ?? 200, { "Content-Type": current.contentType ?? "application/json" });
  response.end(current.raw ?? JSON.stringify(current.body));
}).listen(3181, "127.0.0.1");
