import { createServer } from "node:http";

// Read-only localhost diagnostic: no credentials, mutations or profile-view GETs.
const origin = "http://localhost/karban";
const checks = [
  ["pretty-specialists", `${origin}/wp-json/nahan/v1/specialists?per_page=1`],
  ["plain-specialists", `${origin}/index.php?rest_route=/nahan/v1/specialists&per_page=1`],
  ["plain-categories", `${origin}/index.php?rest_route=/wp/v2/job_category&per_page=1`],
  ["plain-cities", `${origin}/index.php?rest_route=/wp/v2/city&per_page=1`],
  ["plain-graphql", `${origin}/index.php?graphql&query=${encodeURIComponent("{ __typename }")}`],
];

const report = Promise.all(checks.map(async ([name, url]) => {
  try {
    const response = await fetch(url, {
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { /* Report shape, never raw HTML. */ }
    return {
      name,
      status: response.status,
      contentType: response.headers.get("content-type"),
      json: data !== undefined,
      success: data?.success === true,
      itemCount: Array.isArray(data) ? data.length : data?.data?.items?.length ?? null,
      graphqlType: data?.data?.__typename ?? null,
    };
  } catch (error) {
    return {
      name,
      status: null,
      error: error instanceof Error ? error.name : "UnknownError",
      code: error?.cause?.code ?? null,
    };
  }
}));

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    return response.end();
  }
  response.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify({ origin, readOnly: true, checks: await report }, null, 2));
});
server.listen(3003, "127.0.0.1", () => console.info("Local WordPress read-only diagnostic on port 3003"));
