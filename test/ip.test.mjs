import assert from "node:assert/strict";
import { test } from "node:test";

import { cidrContains, isLoopbackIp } from "../src/ip.mjs";

test("CIDR containment supports IPv4 and IPv6", () => {
  assert.equal(cidrContains("10.42.7.18", "10.0.0.0/8"), true);
  assert.equal(cidrContains("11.42.7.18", "10.0.0.0/8"), false);
  assert.equal(cidrContains("2001:db8::42", "2001:db8::/32"), true);
  assert.equal(cidrContains("2001:db9::42", "2001:db8::/32"), false);
  assert.equal(cidrContains("10.0.0.1", "2001:db8::/32"), false);
});

test("loopback detection covers IPv4 and IPv6", () => {
  assert.equal(isLoopbackIp("127.0.0.1"), true);
  assert.equal(isLoopbackIp("127.99.1.2"), true);
  assert.equal(isLoopbackIp("::1"), true);
  assert.equal(isLoopbackIp("10.0.0.1"), false);
});

test("invalid CIDR input fails fast", () => {
  assert.throws(() => cidrContains("10.0.0.1", "10.0.0.0/99"), /Invalid CIDR/);
});
