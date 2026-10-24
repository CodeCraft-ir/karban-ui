export interface PaymentRuntimeConfig {
    appOrigin: string;
    wordpressUrl: string;
}
/** Server-owned inputs only. No request Host/Forwarded/Origin participates in transport selection. */
export function paymentConfig(env: Readonly<Record<string, unknown>>): PaymentRuntimeConfig | undefined {
    if (env.KARBAN_ALLOW_LOCAL_PAYMENTS !== 'true' || env.KARBAN_LOCAL_DEVELOPMENT !== 'true' || (env.NODE_ENV !== 'development' && env.NODE_ENV !== 'test'))
        return;
    function local(value: unknown, originOnly: boolean): string | undefined {
        if (typeof value !== 'string')
            return;
        try {
            // Match the established WordPress installation URL convention for one
            // trailing slash only. APP_ORIGIN stays exact; repeated/interior slashes
            // and every other ambiguous representation still fail canonical checks.
            const candidate = !originOnly && value.endsWith('/') ? value.slice(0, -1) : value;
            const u = new URL(candidate);
            if (!['http:', 'https:'].includes(u.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) || u.username || u.password || u.search || u.hash)
                return;
            const canonical = originOnly ? u.origin : u.origin + u.pathname.replace(/\/$/u, '');
            if (candidate !== canonical || (originOnly && u.pathname !== '/') || (!originOnly && !/^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::[0-9]+)?(?:\/[A-Za-z0-9_-]+)*$/u.test(candidate)))
                return;
            return canonical;
        }
        catch {
            return;
        }
    }
    const appOrigin = local(env.APP_ORIGIN, true), wordpressUrl = local(env.WORDPRESS_URL, false);
    if (appOrigin && wordpressUrl)
        return { appOrigin, wordpressUrl };
}
