import type { ProfileService } from "./profile-service.ts";
import { ProfileBoundaryError, parseMediaId, type InputKind } from "./profile-contracts.ts";
import { parseProfileJson, parseProfileMultipart } from "./profile-request-policy.ts";
import { safeProfileError } from "./profile-errors.ts";

export interface ProfileRouteDependencies {
  appOrigin: string | undefined;
  getService(readOnly: boolean): Promise<ProfileService>;
}
const headers = { "Cache-Control": "private, no-store", Pragma: "no-cache", Vary: "Cookie" };
function json(body: unknown, status = 200) { return Response.json(body, { status, headers }); }
function failure(error: unknown, mutation = false) {
  const safe = safeProfileError(error, mutation);
  return json({ error: { code: safe.code, message: safe.message, reloadRequired: mutation } }, safe.status);
}

export function createProfileRouteHandlers(dependencies: ProfileRouteDependencies) {
  function origin(request: Request): string {
    if (!dependencies.appOrigin) throw new ProfileBoundaryError("profile_unavailable", 503);
    if (new URL(request.url).search) throw new ProfileBoundaryError("invalid_request", 400);
    return dependencies.appOrigin;
  }
  async function run(operation: (s: ProfileService) => Promise<unknown>, mutation = false): Promise<Response> {
    try { return json(await operation(await dependencies.getService(!mutation))); }
    catch (error) { return failure(error, mutation); }
  }
  async function read(request: Request, operation: (s: ProfileService) => Promise<unknown>): Promise<Response> {
    try { origin(request); return await run(operation); }
    catch (error) { return failure(error); }
  }
  async function write(
    request: Request, kind: InputKind,
    operation: (s: ProfileService, body: Record<string, unknown>) => Promise<unknown>,
  ): Promise<Response> {
    // CSRF, bounded parsing, and authority validation precede session/upstream access.
    try {
      const body = await parseProfileJson(request, origin(request), kind);
      return await run(s => operation(s, body), true);
    } catch (error) { return failure(error, true); }
  }
  return {
    account: (request: Request) => read(request, async s => ({ account: await s.account() })),
    profile: (request: Request) => read(request, async s => ({ profile: await s.profile() })),
    capabilities: (request: Request) => read(request, async s => ({ capabilities: await s.capabilities() })),
    updateAccount: (request: Request) => write(request, "account", async (s, body) => ({ account: await s.updateAccount(body) })),
    updateProfile: (request: Request) => write(request, "profile", async (s, body) => ({ profile: await s.updateProfile(body) })),
    submit: (request: Request) => write(request, "submit", async s => ({ profile: await s.submit() })),
    addGallery: (request: Request) => write(request, "gallery", async (s, body) => ({ gallery: await s.addGallery(body) })),
    async deleteGallery(request: Request, id: string) {
      try {
        origin(request);
        parseMediaId(id);
        // Optional revision body; absence is an empty object, NOT an alternate query input.
        const normalizedHeaders = new Headers(request.headers);
        normalizedHeaders.set("content-type", "application/json");
        const normalized = request.body === null ? new Request(request.url, {
          method: "DELETE", headers: normalizedHeaders, body: "{}", signal: request.signal,
        }) : request;
        return await write(normalized, "delete", async (s, body) => ({ gallery: await s.deleteGallery(id, body) }));
      } catch (error) { return failure(error, true); }
    },
    async upload(request: Request) {
      try {
        const input = await parseProfileMultipart(request, origin(request));
        return await run(async s => ({ media: await s.upload(input) }), true);
      } catch (error) { return failure(error, true); }
    },
  };
}
