import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import {
  getWordPressConfig,
  getWordPressGraphqlEndpoint,
  getWordPressOrigin,
  getWordPressRestBaseUrl,
  normalizeWordPressOrigin,
} from "./config.ts";

const environment = process.env as Record<string, string | undefined>;
const originalWordPressUrl = environment.WORDPRESS_URL;
const originalNodeEnv = environment.NODE_ENV;

before(() => {
  process.env.WORDPRESS_URL = "https://codecraft.ir/kar/";
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

test("normalizes /kar/ and builds the exact WordPress endpoints", () => {
  const configuredUrl = " https://codecraft.ir/kar/ ";

  assert.equal(
    normalizeWordPressOrigin(configuredUrl),
    "https://codecraft.ir/kar",
  );
  assert.equal(
    getWordPressRestBaseUrl(configuredUrl),
    "https://codecraft.ir/kar/wp-json/nahan/v1/",
  );
  assert.equal(
    getWordPressGraphqlEndpoint(configuredUrl),
    "https://codecraft.ir/kar/graphql",
  );
  assert.deepEqual(getWordPressConfig(configuredUrl), {
    origin: "https://codecraft.ir/kar",
    restBaseUrl: "https://codecraft.ir/kar/wp-json/nahan/v1/",
    graphqlEndpoint: "https://codecraft.ir/kar/graphql",
  });
});

test("reads the server-only WORDPRESS_URL without a live fallback", () => {
  assert.equal(getWordPressOrigin(), "https://codecraft.ir/kar");

  const previous = environment.WORDPRESS_URL;
  delete environment.WORDPRESS_URL;
  try {
    assert.throws(
      () => getWordPressOrigin(),
      /WORDPRESS_URL is required/,
    );
  } finally {
    if (previous === undefined) {
      delete environment.WORDPRESS_URL;
    } else {
      environment.WORDPRESS_URL = previous;
    }
  }
});

test("rejects malformed or unsafe configured URLs", () => {
  const malformedUrls = [
    "",
    "not-a-url",
    "/kar",
    "ftp://codecraft.ir/kar",
    "https://user:password@codecraft.ir/kar",
    "https://codecraft.ir/kar?token=secret",
    "https://codecraft.ir/kar#fragment",
  ];

  for (const malformedUrl of malformedUrls) {
    assert.throws(() => normalizeWordPressOrigin(malformedUrl), malformedUrl);
  }
});

test("rejects an HTTP origin in production while allowing it outside production", () => {
  environment.NODE_ENV = "production";
  assert.throws(
    () => normalizeWordPressOrigin("http://localhost:8080/kar/"),
    /HTTPS in production/,
  );

  environment.NODE_ENV = "test";
  assert.equal(
    normalizeWordPressOrigin("http://localhost:8080/kar/"),
    "http://localhost:8080/kar",
  );
});
