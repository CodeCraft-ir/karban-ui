export const WORDPRESS_URL_ENV = "WORDPRESS_URL" as const;
export const WORDPRESS_REST_NAMESPACE = "nahan/v1" as const;

export interface WordPressConfig {
  origin: string;
  restBaseUrl: string;
  graphqlEndpoint: string;
}

function readWordPressUrl(): string {
  const configuredUrl =
    typeof process !== "undefined" ? process.env[WORDPRESS_URL_ENV] : undefined;

  if (!configuredUrl || configuredUrl.trim().length === 0) {
    throw new Error("WORDPRESS_URL is required for the server-side WordPress client.");
  }

  return configuredUrl;
}

function isProduction(): boolean {
  return typeof process !== "undefined" && process.env.NODE_ENV === "production";
}

/**
 * Normalize only the origin configured for WordPress. The pathname is part of
 * the origin for this deployment, so it must be retained (for example, /kar).
 */
export function normalizeWordPressOrigin(configuredUrl = readWordPressUrl()): string {
  if (typeof configuredUrl !== "string" || configuredUrl.trim().length === 0) {
    throw new Error("WORDPRESS_URL must be a non-empty absolute URL.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(configuredUrl.trim());
  } catch {
    throw new Error("WORDPRESS_URL must be a valid absolute URL.");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("WORDPRESS_URL must use the http or https protocol.");
  }

  if (isProduction() && parsedUrl.protocol !== "https:") {
    throw new Error("WORDPRESS_URL must use HTTPS in production.");
  }

  if (
    parsedUrl.origin === "null" ||
    parsedUrl.hostname.length === 0 ||
    parsedUrl.username.length > 0 ||
    parsedUrl.password.length > 0 ||
    parsedUrl.search.length > 0 ||
    parsedUrl.hash.length > 0
  ) {
    throw new Error(
      "WORDPRESS_URL must contain only a scheme, host, port, and pathname.",
    );
  }

  const pathname = parsedUrl.pathname.replace(/\/+$/, "");
  return `${parsedUrl.origin}${pathname}`;
}

export function getWordPressOrigin(configuredUrl?: string): string {
  return normalizeWordPressOrigin(configuredUrl);
}

export function getWordPressRestBaseUrl(configuredUrl?: string): string {
  return `${getWordPressOrigin(configuredUrl)}/wp-json/${WORDPRESS_REST_NAMESPACE}/`;
}

export function getWordPressGraphqlEndpoint(configuredUrl?: string): string {
  return `${getWordPressOrigin(configuredUrl)}/graphql`;
}

export function getWordPressConfig(configuredUrl?: string): WordPressConfig {
  return {
    origin: getWordPressOrigin(configuredUrl),
    restBaseUrl: getWordPressRestBaseUrl(configuredUrl),
    graphqlEndpoint: getWordPressGraphqlEndpoint(configuredUrl),
  };
}

/**
 * Isolated replacement point for the server-only package once it can be
 * installed. Transport entry points call this before touching credentials.
 */
export function assertWordPressServerOnly(): void {
  if (typeof window !== "undefined") {
    throw new Error("The WordPress client can only be called from the server.");
  }
}

// Friendly aliases for internal callers that prefer shorter URL names.
export const normalizeWordPressUrl = normalizeWordPressOrigin;
export const getWordPressRestUrl = getWordPressRestBaseUrl;
export const getWordPressGraphqlUrl = getWordPressGraphqlEndpoint;
