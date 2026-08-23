import assert from "node:assert/strict";
import { test } from "node:test";

import { renderConsole } from "../src/render-console.mjs";
import { renderHtml } from "../src/render-html.mjs";

const report = {
  reportVersion: 1,
  profiles: [
    { id: "curl", name: "curl", baseline: "7.86+", source: "https://curl.example" },
    { id: "go", name: "Go", baseline: "stdlib", source: "https://go.example" },
  ],
  targets: [
    {
      url: "https://internal.example/<img src=x onerror=alert(1)>",
      hostname: "internal.example",
      port: "443",
      resolvedIps: [],
      agreement: false,
      decisions: [
        {
          profileId: "curl",
          route: "DIRECT",
          proxyVariable: "https_proxy",
          proxyUrl: null,
          noProxyVariable: "no_proxy",
          matchedRule: ".internal.example",
          reason: "matched <unsafe>",
        },
        {
          profileId: "go",
          route: "PROXY",
          proxyVariable: "HTTPS_PROXY",
          proxyUrl: "http://proxy.example:8080/",
          noProxyVariable: "NO_PROXY",
          matchedRule: null,
          reason: "no exclusion matched",
        },
      ],
    },
  ],
  findings: [
    {
      code: "ROUTE_DISAGREEMENT",
      severity: "error",
      targetUrl: "https://internal.example/",
      message: "Clients disagree.",
    },
  ],
  summary: {
    targetCount: 1,
    agreementCount: 0,
    disagreementCount: 1,
    errorCount: 0,
    warningCount: 0,
  },
};

test("console renderer exposes routes, variables, and summary", () => {
  const output = renderConsole(report);

  assert.match(output, /ProxyParity/);
  assert.match(output, /1 disagreement/);
  assert.match(output, /curl\s+DIRECT/);
  assert.match(output, /go\s+PROXY/);
  assert.match(output, /HTTPS_PROXY/);
  assert.match(output, /ROUTE_DISAGREEMENT/);
});

test("HTML renderer is standalone, script-free, and escapes report values", () => {
  const output = renderHtml(report, { title: "Demo <report>" });

  assert.match(output, /^<!doctype html>/i);
  assert.match(output, /Demo &lt;report&gt;/);
  assert.match(output, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(output, /matched &lt;unsafe&gt;/);
  assert.doesNotMatch(output, /<script[\s>]/i);
  assert.match(output, /<style>/);
  assert.match(output, /Content-Security-Policy/);
  assert.match(output, /ROUTE_DISAGREEMENT/);
});
