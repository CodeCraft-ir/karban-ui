import { AuthCoordinatorError } from "../auth/auth-coordinator.ts";
import { AuthRequestPolicyError } from "../../lib/auth-request-policy.ts";
import { WordPressApiError } from "../wordpress/errors.ts";
import { ProfileBoundaryError } from "./profile-contracts.ts";

const backendStatus: Record<string, number> = {
  unauthenticated:401, forbidden:403, no_profile:404, gallery_media_not_found:404,
  invalid_profile_state:409, profile_link_conflict:409, duplicate_media:409, gallery_busy:409,
  gallery_revision_conflict:409, gallery_revision_exhausted:409, gallery_storage_unavailable:409,
  invalid_availability:422, invalid_categories:422, invalid_city:422, invalid_display_name:422,
  invalid_experience:422, invalid_media:422, invalid_taxonomy:422, profile_incomplete:422,
  unknown_field:422, invalid_title:422, invalid_bio:422, invalid_skills:422, invalid_price_hint:422,
  invalid_address:422, gallery_full:422, invalid_gallery:422, invalid_revision:422,
  empty_upload:422, invalid_purpose:422, invalid_upload:422, upload_incomplete:422,
  image_decoder_unavailable_or_invalid:415, invalid_image:415, mime_not_allowed:415, video_unsupported:415,
  too_large:413, media_detection_unavailable:503,
};
/** Never reuse backend message/data/cause, even when transport redacted tokens. */
export function safeProfileError(error: unknown, mutation = false): ProfileBoundaryError {
  if (error instanceof ProfileBoundaryError) return error;
  if (error instanceof AuthRequestPolicyError || error instanceof AuthCoordinatorError) return new ProfileBoundaryError(error.code, error.status);
  if (error instanceof WordPressApiError && Object.hasOwn(backendStatus,error.code)) return new ProfileBoundaryError(error.code,backendStatus[error.code]);
  return new ProfileBoundaryError(mutation ? "operation_uncertain" : "profile_unavailable",503);
}
