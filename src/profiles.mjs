import { isLoopbackIp } from "./ip.mjs";
import {
  matchCurlRule,
  matchGoRule,
  matchPythonRule,
  matchRubyRule,
  matchWgetRule,
  splitRules,
} from "./matchers.mjs";

export const PROFILES = [
  {
    id: "curl",
    name: "curl",
    baseline: "7.86+ environment behavior",
    source: "https://everything.curl.dev/usingcurl/proxies/env.html",
  },
  {
    id: "wget",
    name: "GNU Wget",
    baseline: "1.x",
    source: "https://github.com/mirror/wget/blob/master/src/retr.c",
  },
  {
    id: "python",
    name: "CPython urllib.request",
    baseline: "3.14",
    source: "https://github.com/python/cpython/blob/main/Lib/urllib/request.py",
  },
  {
    id: "go",
    name: "Go net/http",
    baseline: "stdlib vendored httpproxy",
    source:
      "https://github.com/golang/go/blob/master/src/vendor/golang.org/x/net/http/httpproxy/proxy.go",
  },
  {
    id: "ruby",
    name: "Ruby URI::Generic",
    baseline: "URI 1.x",
    source: "https://github.com/ruby/uri/blob/master/lib/uri/generic.rb",
  },
];

export const PROFILE_IDS = PROFILES.map((profile) => profile.id);

function has(environment, key) {
  return Object.hasOwn(environment, key);
}

function firstPresent(environment, keys, { skipEmpty = false } = {}) {
  for (const key of keys) {
    if (has(environment, key) && (!skipEmpty || environment[key] !== "")) {
      return { variable: key, value: environment[key] };
    }
  }
  return { variable: null, value: "" };
}

function selectRubyHttpProxy(environment) {
  if (!has(environment, "REQUEST_METHOD")) {
    return firstPresent(environment, ["http_proxy", "HTTP_PROXY"]);
  }

  const pairCount = Number(has(environment, "http_proxy")) + Number(has(environment, "HTTP_PROXY"));
  let selected = { variable: null, value: "" };
  if (pairCount === 1 && has(environment, "http_proxy")) {
    selected = { variable: "http_proxy", value: environment.http_proxy };
  } else if (pairCount > 1) {
    selected = { variable: "http_proxy", value: environment.http_proxy };
  }
  if (selected.variable === null && has(environment, "CGI_HTTP_PROXY")) {
    return { variable: "CGI_HTTP_PROXY", value: environment.CGI_HTTP_PROXY };
  }
  return selected;
}

function selectProxy(profileId, target, environment) {
  const lower = `${target.scheme}_proxy`;
  const upper = `${target.scheme.toUpperCase()}_PROXY`;

  if (profileId === "curl") {
    return target.scheme === "http"
      ? firstPresent(environment, [lower])
      : firstPresent(environment, [lower, upper]);
  }
  if (profileId === "wget") {
    return firstPresent(environment, [lower]);
  }
  if (profileId === "python") {
    if (target.scheme === "http" && has(environment, "REQUEST_METHOD")) {
      return firstPresent(environment, [lower]);
    }
    return firstPresent(environment, [lower, upper]);
  }
  if (profileId === "go") {
    return firstPresent(environment, [upper, lower], { skipEmpty: true });
  }
  if (target.scheme === "http") {
    return selectRubyHttpProxy(environment);
  }
  return firstPresent(environment, [lower, upper]);
}

function selectNoProxy(profileId, environment) {
  if (profileId === "wget") {
    return firstPresent(environment, ["no_proxy"]);
  }
  if (profileId === "go") {
    return firstPresent(environment, ["NO_PROXY", "no_proxy"], { skipEmpty: true });
  }
  return firstPresent(environment, ["no_proxy", "NO_PROXY"]);
}

function findMatchingRule(profileId, target, value) {
  const rules = splitRules(value);
  if (profileId === "python" && value.trim() === "*") {
    return "*";
  }

  const matcher = {
    curl: matchCurlRule,
    wget: matchWgetRule,
    python: matchPythonRule,
    go: matchGoRule,
    ruby: matchRubyRule,
  }[profileId];
  return rules.find((rule) => matcher(target, rule)) ?? null;
}

function sanitizeProxyUrl(value) {
  const withScheme = value.includes("://") ? value : `http://${value}`;
  const url = new URL(withScheme);
  if (url.username) {
    url.username = "***";
  }
  if (url.password) {
    url.password = "***";
  }
  return url.href;
}

function directDecision(profileId, proxy, noProxy, matchedRule, reason) {
  return {
    profileId,
    route: "DIRECT",
    proxyVariable: proxy.variable,
    proxyUrl: null,
    noProxyVariable: noProxy.variable,
    matchedRule,
    reason,
  };
}

export function evaluateProfile(profileId, target, environment) {
  if (!PROFILE_IDS.includes(profileId)) {
    throw new TypeError(`Unknown profile: ${profileId}`);
  }

  const proxy = selectProxy(profileId, target, environment);
  const noProxy = selectNoProxy(profileId, environment);
  if (proxy.value === "") {
    return directDecision(
      profileId,
      proxy,
      noProxy,
      null,
      `${profileId} has no ${target.scheme.toUpperCase()} proxy configured.`,
    );
  }

  if (profileId === "go" && target.scheme === "http" && has(environment, "REQUEST_METHOD")) {
    return {
      profileId,
      route: "ERROR",
      proxyVariable: proxy.variable,
      proxyUrl: null,
      noProxyVariable: noProxy.variable,
      matchedRule: null,
      reason: "Go refuses to use an HTTP proxy in a CGI environment.",
    };
  }

  if (
    profileId === "go" &&
    (target.hostname === "localhost" || (target.literalIp && isLoopbackIp(target.literalIp)))
  ) {
    return directDecision(
      profileId,
      proxy,
      noProxy,
      null,
      "Go bypasses localhost and literal loopback addresses.",
    );
  }

  const rubyAddress = target.literalIp ?? target.resolvedIps[0];
  if (profileId === "ruby" && rubyAddress && isLoopbackIp(rubyAddress)) {
    return directDecision(
      profileId,
      proxy,
      noProxy,
      null,
      "Ruby bypasses its first resolved loopback address.",
    );
  }

  const matchedRule = noProxy.value ? findMatchingRule(profileId, target, noProxy.value) : null;
  if (matchedRule !== null) {
    return directDecision(
      profileId,
      proxy,
      noProxy,
      matchedRule,
      `${profileId} matched ${noProxy.variable} rule ${JSON.stringify(matchedRule)}.`,
    );
  }

  return {
    profileId,
    route: "PROXY",
    proxyVariable: proxy.variable,
    proxyUrl: sanitizeProxyUrl(proxy.value),
    noProxyVariable: noProxy.variable,
    matchedRule: null,
    reason: `${profileId} selected ${proxy.variable}; no exclusion rule matched.`,
  };
}
