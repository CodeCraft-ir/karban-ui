import "server-only";

import { createRequestAuthCoordinator } from "../auth/auth-bff.server.ts";
import { getAuthRuntimeConfig } from "../auth/auth-runtime-config.ts";
import { wordpressRest } from "../wordpress/rest-client.ts";
import { createWordPressProfileUpload } from "./wordpress-profile-upload.ts";
import { createProfileGateway } from "./profile-gateway.ts";
import { createProfileService } from "./profile-service.ts";
import { createProfileRouteHandlers } from "./profile-route-adapters.ts";

async function requestService(readOnly: boolean) {
  const auth = await createRequestAuthCoordinator(readOnly);
  const gateway = createProfileGateway({json: wordpressRest, upload: createWordPressProfileUpload()});
  return createProfileService({auth,gateway});
}

/** Handler-only composition: fixed upstream adapters, never browser-supplied URLs/options. */
export function getProfileRouteHandlers() {
  return createProfileRouteHandlers({appOrigin:getAuthRuntimeConfig()?.appOrigin,getService:requestService});
}

/** Server Component helpers are fresh reads and never save, destroy, refresh or rotate cookies. */
export async function readOwnerAccount() { return (await requestService(true)).account(); }
export async function readOwnerProfile() { return (await requestService(true)).profile(); }
export async function readOwnerMediaCapabilities() { return (await requestService(true)).capabilities(); }
