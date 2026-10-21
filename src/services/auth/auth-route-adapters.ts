import {
  AuthRequestPolicyError,
  parseLogoutRequest,
  parseOtpRequest,
  parseOtpVerifyRequest,
  parseRefreshRequest,
} from "../../lib/auth-request-policy.ts";
import { AuthCoordinatorError, type AuthCoordinator } from "./auth-coordinator.ts";

export interface AuthRouteAdapterDependencies {
  appOrigin: string | undefined;
  getCoordinator: () => Promise<AuthCoordinator>;
}

export interface AuthRouteHandlers {
  request(request: Request): Promise<Response>;
  verify(request: Request): Promise<Response>;
  challenge(request: Request): Promise<Response>;
  me(request: Request): Promise<Response>;
  refresh(request: Request): Promise<Response>;
  logout(request: Request): Promise<Response>;
}

const privateNoStoreHeaders = {
  "Cache-Control": "private, no-store",
  Pragma: "no-cache",
  Vary: "Cookie",
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: privateNoStoreHeaders });
}

function empty(status: number): Response {
  return new Response(null, { status, headers: privateNoStoreHeaders });
}

function errorResponse(error: unknown): Response {
  if (error instanceof AuthRequestPolicyError || error instanceof AuthCoordinatorError) {
    return json({ error: { code: error.code } }, error.status);
  }
  return json({ error: { code: "auth_unavailable" } }, 503);
}

function unavailable(): Response {
  return json({ error: { code: "auth_unavailable" } }, 503);
}

export function createAuthRouteHandlers(dependencies: AuthRouteAdapterDependencies): AuthRouteHandlers {
  async function withCoordinator<T>(operation: (coordinator: AuthCoordinator) => Promise<T>): Promise<Response> {
    if (!dependencies.appOrigin) {
      return unavailable();
    }
    try {
      return json(await operation(await dependencies.getCoordinator()));
    } catch (error) {
      return errorResponse(error);
    }
  }

  return {
    async request(request) {
      if (!dependencies.appOrigin) {
        return unavailable();
      }
      try {
        const body = await parseOtpRequest(request, dependencies.appOrigin);
        return await withCoordinator((coordinator) => coordinator.requestOtp(body.phone, body.role));
      } catch (error) {
        return errorResponse(error);
      }
    },
    async verify(request) {
      if (!dependencies.appOrigin) {
        return unavailable();
      }
      try {
        const body = await parseOtpVerifyRequest(request, dependencies.appOrigin);
        return await withCoordinator((coordinator) => coordinator.verifyOtp(body.code));
      } catch (error) {
        return errorResponse(error);
      }
    },
    async challenge() {
      return withCoordinator(async (coordinator) => ({ challenge: coordinator.challenge() }));
    },
    async me() {
      return withCoordinator((coordinator) => coordinator.me());
    },
    async refresh(request) {
      if (!dependencies.appOrigin) {
        return unavailable();
      }
      try {
        await parseRefreshRequest(request, dependencies.appOrigin);
        return await withCoordinator((coordinator) => coordinator.refresh());
      } catch (error) {
        return errorResponse(error);
      }
    },
    async logout(request) {
      if (!dependencies.appOrigin) {
        return unavailable();
      }
      try {
        await parseLogoutRequest(request, dependencies.appOrigin);
        const coordinator = await dependencies.getCoordinator();
        await coordinator.logout();
        return empty(204);
      } catch (error) {
        return errorResponse(error);
      }
    },
  };
}
