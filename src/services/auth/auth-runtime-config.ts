export interface AuthRuntimeConfig {
  appOrigin: string;
  ironPassword: string;
}

function normalizedOrigin(value: string | undefined): string | undefined {
  if (!value || value.trim().length === 0) {
    return undefined;
  }
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return undefined;
    }
    if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") {
      return undefined;
    }
    return parsed.origin;
  } catch {
    return undefined;
  }
}

export function getAuthRuntimeConfig(environment: NodeJS.ProcessEnv = process.env): AuthRuntimeConfig | undefined {
  const appOrigin = normalizedOrigin(environment.APP_ORIGIN);
  const ironPassword = environment.IRON_SESSION_PASSWORD;
  if (!appOrigin || !ironPassword || ironPassword.trim().length < 32) {
    return undefined;
  }
  return { appOrigin, ironPassword };
}

export function isLoopbackWordPressOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return false;
  }
  try {
    const url = new URL(origin);
    return url.protocol === "http:" && (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "[::1]"
    );
  } catch {
    return false;
  }
}

export function isLoopbackOtpAllowed(
  environment: NodeJS.ProcessEnv = process.env,
  wordpressOrigin: string | undefined,
): boolean {
  return (
    environment.KARBAN_LOCAL_DEVELOPMENT === "true" &&
    environment.NODE_ENV !== "production" &&
    isLoopbackWordPressOrigin(wordpressOrigin)
  );
}
