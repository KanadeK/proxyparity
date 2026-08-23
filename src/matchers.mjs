import { isIP } from "node:net";
import { domainToASCII } from "node:url";

import { cidrContains } from "./ip.mjs";

export function splitRules(value) {
  return value
    .split(",")
    .map((rule) => rule.trim())
    .filter(Boolean);
}

export function splitRubyRules(value) {
  return [...value.matchAll(/([^:,\s]+)(?::(\d+))?/g)].map((match) =>
    match[2] ? `${match[1]}:${match[2]}` : match[1],
  );
}

function normalizeDomain(value) {
  const ascii = domainToASCII(value.toLowerCase());
  return ascii || value.toLowerCase();
}

function boundaryDomainMatch(hostname, rule) {
  const normalizedRule = normalizeDomain(rule);
  return hostname === normalizedRule || hostname.endsWith(`.${normalizedRule}`);
}

function parseRulePort(rule) {
  const bracketed = /^\[([^\]]+)\](?::(\d+))?$/.exec(rule);
  if (bracketed) {
    return { host: bracketed[1], port: bracketed[2] ?? null };
  }
  if (isIP(rule) > 0 || rule.includes("/")) {
    return { host: rule, port: null };
  }
  const hostAndPort = /^([^:]+):(\d+)$/.exec(rule);
  if (hostAndPort) {
    return { host: hostAndPort[1], port: hostAndPort[2] };
  }
  return { host: rule, port: null };
}

function isCidr(value) {
  const slash = value.lastIndexOf("/");
  return slash > 0 && isIP(value.slice(0, slash)) > 0;
}

function literalIpRuleMatches(target, rule) {
  return target.literalIp !== null && isIP(rule) > 0 && target.literalIp === rule;
}

export function matchCurlRule(target, rule) {
  if (rule === "*") {
    return true;
  }
  if (isCidr(rule)) {
    return target.literalIp !== null && cidrContains(target.literalIp, rule);
  }
  if (literalIpRuleMatches(target, rule)) {
    return true;
  }
  const domainRule = rule.startsWith(".") ? rule.slice(1) : rule;
  return boundaryDomainMatch(target.hostname, domainRule);
}

export function matchWgetRule(target, rule) {
  return target.hostname.toLowerCase().endsWith(rule.toLowerCase());
}

export function matchPythonRule(target, rule) {
  const domainRule = rule.replace(/^\.+/, "").toLowerCase();
  const hostWithPort = `${target.hostname}:${target.port}`;
  return (
    boundaryDomainMatch(target.hostname, domainRule) ||
    boundaryDomainMatch(hostWithPort, domainRule)
  );
}

export function matchGoRule(target, rule) {
  if (rule === "*") {
    return true;
  }
  if (isCidr(rule)) {
    return target.literalIp !== null && cidrContains(target.literalIp, rule);
  }

  const parsed = parseRulePort(rule);
  if (parsed.port !== null && parsed.port !== target.port) {
    return false;
  }
  if (isIP(parsed.host) > 0) {
    return target.literalIp === parsed.host;
  }
  if (target.literalIp !== null) {
    return false;
  }

  let domainRule = parsed.host;
  if (domainRule.startsWith("*.")) {
    domainRule = domainRule.slice(1);
  }
  if (domainRule.startsWith(".")) {
    return target.hostname.endsWith(normalizeDomain(domainRule));
  }
  return boundaryDomainMatch(target.hostname, domainRule);
}

export function matchRubyRule(target, rule) {
  const parsed = parseRulePort(rule);
  if (parsed.port !== null && parsed.port !== target.port) {
    return false;
  }

  const domainRule = parsed.host.toLowerCase();
  const domainMatch = domainRule.startsWith(".")
    ? target.hostname.endsWith(domainRule)
    : boundaryDomainMatch(target.hostname, domainRule);
  if (domainMatch) {
    return true;
  }

  const address = target.literalIp ?? target.resolvedIps[0];
  if (!address) {
    return false;
  }
  if (isCidr(parsed.host)) {
    return cidrContains(address, parsed.host);
  }
  return isIP(parsed.host) > 0 && address === parsed.host;
}
