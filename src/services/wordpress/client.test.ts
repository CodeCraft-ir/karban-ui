import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import {
  getWordPressGraphqlEndpoint,
  getWordPressRestBaseUrl,
} from "./config.ts";
import { WordPressApiError } from "./errors.ts";
import { wordpressGraphql } from "./graphql-client.ts";
import {
  wordpressRest,
  type WordPressFetch,
  type WordPressRequestOptions,
} from "./rest-client.ts";

const environment = process.env as Record<string, string | undefined>;
const TEST_WORDPRESS_URL = "https://codecraft.ir/kar/";
const originalWordPressUrl = environment.WORDPRESS_URL;
const originalNodeEnv = environment.NODE_ENV;

before(() => {
  process.env.WORDPRESS_URL = TEST_WORDPRESS_URL;
  environment.NODE_ENV = "test";
});

after(() => {
  if (originalWordPressUrl === undefined) {
    delete process.env.WORDPRESS_URL;
  } else {
    process.env.WORDPRESS_URL = originalWordPressUrl;
  }

  if (originalNodeEnv === undefined) {
    delete environment.NODE_ENV;
  } else {
    environment.NODE_ENV = originalNodeEnv;
  }
});

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function responseHeaders(init: RequestInit | undefined): Headers {
  return new Headers(init?.headers);
}

test("extracts REST success data and applies the server request contract", async () => {
  let requestedUrl: RequestInfo | URL | undefined;
  let requestedInit: RequestInit | undefined;

  const data = await wordpressRest<{ id: number }>("specialists?published=1", {
    fetch: async (input, init) => {
      requestedUrl = input;
      requestedInit = init;
      return jsonResponse({ success: true, data: { id: 42 } });
    },
  });

  assert.deepEqual(data, { id: 42 });
  assert.equal(
    requestedUrl,
    `${getWordPressRestBaseUrl(TEST_WORDPRESS_URL)}specialists?published=1`,
  );
  assert.equal(requestedInit?.method, "GET");
  assert.equal(responseHeaders(requestedInit).get("accept"), "application/json");
  assert.equal(responseHeaders(requestedInit).has("content-type"), false);
  assert.equal(requestedInit?.cache, "no-store");
  assert.ok(requestedInit?.signal instanceof AbortSignal);
});

test("sends JSON and a caller-supplied bearer token without exposing it elsewhere", async () => {
  let requestedInit: RequestInit | undefined;
  const token = "secret-bearer-token";

  const data = await wordpressRest<{ ok: boolean }, { title: string }>("projects", {
    method: "POST",
    body: { title: "خانه" },
    token,
    fetch: async (_input, init) => {
      requestedInit = init;
      return jsonResponse({ success: true, data: { ok: true } });
    },
  });

  assert.deepEqual(data, { ok: true });
  const headers = responseHeaders(requestedInit);
  assert.equal(headers.get("authorization"), `Bearer ${token}`);
  assert.equal(headers.get("content-type"), "application/json");
  assert.equal(requestedInit?.body, JSON.stringify({ title: "خانه" }));
});

test("maps REST plugin and HTTP errors without leaking a bearer token", async () => {
  const token = "do-not-leak-this-token";

  await assert.rejects(
    () =>
      wordpressRest("private", {
        token,
        fetch: async () =>
          jsonResponse(
            {
              success: false,
              error: {
                code: "forbidden",
                message: `توکن ${token} معتبر نیست.`,
                data: { authorization: token, safe: "جزئیات عمومی" },
              },
            },
            403,
          ),
      }),
    (error: unknown) => {
      assert.ok(error instanceof WordPressApiError);
      assert.equal(error.status, 403);
      assert.equal(error.code, "forbidden");
      assert.equal(error.message.includes(token), false);
      assert.equal(JSON.stringify(error).includes(token), false);
      assert.deepEqual(error.data, { safe: "جزئیات عمومی" });
      return true;
    },
  );

  await assert.rejects(
    () =>
      wordpressRest("private", {
        token,
        fetch: async () => jsonResponse({ message: token }, 502),
      }),
    (error: unknown) => {
      assert.ok(error instanceof WordPressApiError);
      assert.equal(error.status, 502);
      assert.equal(error.code, "http_error");
      assert.equal(error.message.includes(token), false);
      assert.equal(JSON.stringify(error).includes(token), false);
      return true;
    },
  );
});

test("rejects absolute and traversal REST paths before making a request", async () => {
  let calls = 0;
  const fetch = async () => {
    calls += 1;
    return jsonResponse({ success: true, data: null });
  };

  for (const path of ["https://evil.example/", "//evil.example/", "../users", "%2e%2e/users"]) {
    await assert.rejects(
      () => wordpressRest(path, { fetch }),
      (error: unknown) => {
        assert.ok(error instanceof WordPressApiError);
        assert.equal(error.code, "invalid_path");
        return true;
      },
    );
  }

  assert.equal(calls, 0);
});

test("maps invalid JSON and invalid success envelopes", async () => {
  await assert.rejects(
    () =>
      wordpressRest("broken", {
        fetch: async () => new Response("not-json", { status: 200 }),
      }),
    (error: unknown) => {
      assert.ok(error instanceof WordPressApiError);
      assert.equal(error.status, 200);
      assert.equal(error.code, "invalid_json");
      return true;
    },
  );

  await assert.rejects(
    () =>
      wordpressRest("broken", {
        fetch: async () => jsonResponse({ success: true, result: "wrong-key" }),
      }),
    (error: unknown) => {
      assert.ok(error instanceof WordPressApiError);
      assert.equal(error.code, "invalid_envelope");
      return true;
    },
  );
});

test("aborts and maps a timed-out REST request", async () => {
  let observedAbort = false;

  await assert.rejects(
    () =>
      wordpressRest("slow", {
        timeoutMs: 10,
        fetch: (_input, init) =>
          new Promise<Response>((_resolve, reject) => {
            const signal = init?.signal;
            assert.ok(signal);
            signal.addEventListener(
              "abort",
              () => {
                observedAbort = true;
                reject(signal.reason ?? new Error("aborted"));
              },
              { once: true },
            );
          }),
      }),
    (error: unknown) => {
      assert.ok(error instanceof WordPressApiError);
      assert.equal(error.status, 408);
      assert.equal(error.code, "timeout");
      return true;
    },
  );

  assert.equal(observedAbort, true);
});

test("uses the fixed plain REST and GraphQL endpoints while preserving route-override rejection", async () => {
  const previousMode = environment.WORDPRESS_PERMALINK_MODE;
  environment.WORDPRESS_PERMALINK_MODE = "plain";
  try {
    let restUrl: RequestInfo | URL | undefined;
    await wordpressRest("specialists?per_page=1", {
      fetch: async (input) => {
        restUrl = input;
        return jsonResponse({ success: true, data: [] });
      },
    });
    assert.equal(
      restUrl,
      "https://codecraft.ir/kar/index.php?rest_route=%2Fnahan%2Fv1%2Fspecialists&per_page=1",
    );

    let graphqlUrl: RequestInfo | URL | undefined;
    await wordpressGraphql("query Type { __typename }", {}, {
      fetch: async (input, init) => {
        graphqlUrl = input;
        assert.equal(init?.method, "POST");
        assert.equal(init?.body, JSON.stringify({ query: "query Type { __typename }", variables: {} }));
        return jsonResponse({ data: { __typename: "RootQuery" } });
      },
    });
    assert.equal(graphqlUrl, "https://codecraft.ir/kar/index.php?graphql");

    let fetchCalls = 0;
    await assert.rejects(
      () => wordpressRest("specialists?rest_route=%2Fwp%2Fv2%2Fusers", {
        fetch: async () => {
          fetchCalls += 1;
          return jsonResponse({ success: true, data: [] });
        },
      }),
      (error: unknown) => error instanceof WordPressApiError && error.code === "invalid_path",
    );
    assert.equal(fetchCalls, 0);
  } finally {
    if (previousMode === undefined) delete environment.WORDPRESS_PERMALINK_MODE;
    else environment.WORDPRESS_PERMALINK_MODE = previousMode;
  }
});

test("maps GraphQL errors and extracts successful data", async () => {
  const token = "graphql-secret-token";
  let requestedUrl: RequestInfo | URL | undefined;
  let requestBody: { query: string; variables: Record<string, unknown> } | undefined;

  await assert.rejects(
    () =>
      wordpressGraphql(
        "query Viewer { viewer { id } }",
        { includePrivate: true },
        {
          token,
          fetch: async (input, init) => {
            requestedUrl = input;
            requestBody = JSON.parse(String(init?.body)) as typeof requestBody;
            return jsonResponse({
              errors: [
                {
                  message: `توکن ${token} اجازه ندارد`,
                  extensions: { code: "FORBIDDEN" },
                },
              ],
            });
          },
        },
      ),
    (error: unknown) => {
      assert.ok(error instanceof WordPressApiError);
      assert.equal(error.status, 200);
      assert.equal(error.code, "FORBIDDEN");
      assert.equal(error.message.includes(token), false);
      assert.equal(JSON.stringify(error).includes(token), false);
      return true;
    },
  );

  assert.equal(requestedUrl, getWordPressGraphqlEndpoint(TEST_WORDPRESS_URL));
  assert.deepEqual(requestBody, {
    query: "query Viewer { viewer { id } }",
    variables: { includePrivate: true },
  });

  const data = await wordpressGraphql<{ viewer: { id: string } }>(
    "query Viewer { viewer { id } }",
    {},
    {
      fetch: async (_input, init) => {
        assert.equal(responseHeaders(init).get("accept"), "application/json");
        assert.equal(responseHeaders(init).get("content-type"), "application/json");
        assert.equal(init?.cache, "no-store");
        return jsonResponse({ data: { viewer: { id: "42" } } });
      },
    },
  );

  assert.deepEqual(data, { viewer: { id: "42" } });
});

// Headers resolve immediately, but the real Response body stays unreadable until
// the transport's signal aborts. The callback fires once text() is pending.
function pendingBodyFetch(onTextRead: () => void): WordPressFetch {
  return async (_input, init) => {
    const signal = init?.signal;
    assert.ok(signal);

    const response = new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          signal.addEventListener("abort", () => controller.error(signal.reason), {
            once: true,
          });
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
    const readText = response.text.bind(response);
    response.text = () => {
      const pendingText = readText();
      onTextRead();
      return pendingText;
    };
    return response;
  };
}

const knownKeyCredential = "R1_8nY6qW4xP2vZ";
const keyLeakCases = [
  {
    name: "known credential",
    key: `diagnostic-${knownKeyCredential}-detail`,
    forbidden: knownKeyCredential,
  },
  {
    name: "bearer credential",
    key: "Bearer b9Qv4Xp8Lm2",
    forbidden: "b9Qv4Xp8Lm2",
  },
  {
    name: "JWT",
    key: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI0MiJ9.c2lnbmF0dXJl",
    forbidden: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI0MiJ9.c2lnbmF0dXJl",
  },
];

for (const transport of ["REST", "GraphQL"] as const) {
  const request = (options: WordPressRequestOptions): Promise<unknown> =>
    transport === "REST"
      ? wordpressRest("private", options)
      : wordpressGraphql("query Viewer { viewer { id } }", {}, options);

  test(`round-1: ${transport} classifies timeout during a pending response.text()`, {
    timeout: 2_000,
  }, async () => {
    let textReadStarted = false;

    await assert.rejects(
      () => request({
        timeoutMs: 20,
        fetch: pendingBodyFetch(() => { textReadStarted = true; }),
      }),
      (error: unknown) => {
        assert.ok(error instanceof WordPressApiError);
        assert.equal(error.code, "timeout");
        assert.equal(error.status, 408);
        return true;
      },
    );

    assert.equal(textReadStarted, true);
  });

  test(`round-1: ${transport} classifies caller abort during a pending response.text()`, {
    timeout: 2_000,
  }, async () => {
    const caller = new AbortController();
    let notifyTextRead!: () => void;
    const textReadStarted = new Promise<void>((resolve) => {
      notifyTextRead = resolve;
    });
    const rejectedRequest = assert.rejects(
      () => request({
        signal: caller.signal,
        timeoutMs: 1_000,
        fetch: pendingBodyFetch(notifyTextRead),
      }),
      (error: unknown) => {
        assert.ok(error instanceof WordPressApiError);
        assert.equal(error.code, "aborted");
        assert.equal(error.status, 499);
        return true;
      },
    );

    await textReadStarted;
    caller.abort(new DOMException("Caller cancelled", "AbortError"));
    await rejectedRequest;
  });

  for (const { name, key, forbidden } of keyLeakCases) {
    test(`round-1: ${transport} excludes nested ${name} error keys from serialized errors`, async () => {
      const details = {
        [key]: "private diagnostic",
        nested: [{ details: { [key]: "private diagnostic", safe: "kept" } }],
        safe: "kept",
      };
      const payload = transport === "REST"
        ? {
            success: false,
            error: { code: "forbidden", message: "دسترسی مجاز نیست.", data: details },
          }
        : {
            errors: [{
              message: "دسترسی مجاز نیست.",
              extensions: { code: "FORBIDDEN", ...details },
            }],
          };

      await assert.rejects(
        () => request({
          token: knownKeyCredential,
          fetch: async () => jsonResponse(payload, 403),
        }),
        (error: unknown) => {
          assert.ok(error instanceof WordPressApiError);
          assert.equal(error.status, 403);
          const serialized = JSON.stringify(error);
          assert.equal(serialized.includes(forbidden), false);
          assert.match(serialized, /"safe":"kept"/);
          return true;
        },
      );
    });
  }
}

test("round-1: rejects PHP-normalized rest_route query keys before fetch", async (context) => {
  const reservedKeys = [
    "rest_route",
    "%72est%5Froute",
    "rest.route",
    "rest%2Eroute",
    "rest+route",
    "rest%20route",
    "+rest_route",
    "%20%20rest.route",
    "rest_route[]",
    "rest_route[override]",
    "rest_route%5B%5D",
    "rest%20route%5Bvalue%5D",
    "rest[route",
    "rest%5Broute",
    "rest_route%00ignored",
    "rest.route%00suffix",
    "%20rest%2eroute%00suffix",
    "rest_route%00%5Bignored%5D",
  ];

  for (const key of reservedKeys) {
    await context.test(key, async () => {
      let fetchCalls = 0;

      await assert.rejects(
        () => wordpressRest(`specialists?page=1&${key}=%2Fwp%2Fv2%2Fusers`, {
          fetch: async () => {
            fetchCalls += 1;
            return jsonResponse({ success: true, data: [] });
          },
        }),
        (error: unknown) => {
          assert.ok(error instanceof WordPressApiError);
          assert.equal(error.status, 400);
          assert.equal(error.code, "invalid_path");
          return true;
        },
      );

      assert.equal(fetchCalls, 0);
    });
  }
});

test("round-1: preserves ordinary REST filter and pagination queries", async () => {
  let requestedUrl: RequestInfo | URL | undefined;
  const data = await wordpressRest<{ id: number }[]>(
    "specialists?page=2&per_page=12&filter%5Bverified%5D=1&filter%5Brest_route%5D=visible&search=rest_route&rest_route_hint=allowed",
    {
      fetch: async (input) => {
        requestedUrl = input;
        return jsonResponse({ success: true, data: [{ id: 42 }] });
      },
    },
  );

  assert.deepEqual(data, [{ id: 42 }]);
  assert.equal(
    requestedUrl,
    "https://codecraft.ir/kar/wp-json/nahan/v1/specialists?page=2&per_page=12&filter%5Bverified%5D=1&filter%5Brest_route%5D=visible&search=rest_route&rest_route_hint=allowed",
  );
});
