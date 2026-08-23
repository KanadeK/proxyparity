import { isIP } from "node:net";

const ALLOWED_ENVIRONMENT_KEYS = new Set([
  "http_proxy",
  "HTTP_PROXY",
  "https_proxy",
  "HTTPS_PROXY",
  "no_proxy",
  "NO_PROXY",
  "REQUEST_METHOD",
  "CGI_HTTP_PROXY",
]);
const PROXY_ENVIRONMENT_KEYS = new Set([
  "http_proxy",
  "HTTP_PROXY",
  "https_proxy",
  "HTTPS_PROXY",
  "CGI_HTTP_PROXY",
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function normalizeTarget(input, index) {
  if (!isPlainObject(input)) {
    throw new TypeError(`targets[${index}] must be an object`);
  }
  for (const key of Object.keys(input)) {
    if (key !== "url" && key !== "resolvedIps") {
      throw new TypeError(`targets[${index}].${key} is not supported`);
    }
  }
  if (typeof input.url !== "string" || input.url.length === 0) {
    throw new TypeError(`targets[${index}].url must be a non-empty string`);
  }
  if (input.url.length > 4096) {
    throw new TypeError(`targets[${index}].url exceeds 4096 characters`);
  }

  let parsed;
  try {
    parsed = new URL(input.url);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new TypeError(`targets[${index}].url must be an absolute URL`);
    }
    throw error;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new TypeError(`targets[${index}].url must use http or https`);
  }
  if (parsed.username || parsed.password) {
    throw new TypeError(`targets[${index}].url must not contain credentials`);
  }

  const resolvedIps = input.resolvedIps ?? [];
  if (!Array.isArray(resolvedIps) || resolvedIps.length > 16) {
    throw new TypeError(`targets[${index}].resolvedIps must contain at most 16 addresses`);
  }
  resolvedIps.forEach((address, addressIndex) => {
    if (typeof address !== "string" || isIP(address) === 0) {
      throw new TypeError(
        `targets[${index}].resolvedIps[${addressIndex}] must be an IPv4 or IPv6 address`,
      );
    }
  });

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return {
    url: parsed.href,
    scheme: parsed.protocol.slice(0, -1),
    hostname,
    port: parsed.port || (parsed.protocol === "http:" ? "80" : "443"),
    literalIp: isIP(hostname) > 0 ? hostname : null,
    resolvedIps: [...resolvedIps],
  };
}

export function validateScenario(input) {
  if (!isPlainObject(input)) {
    throw new TypeError("scenario must be an object");
  }
  if (input.schemaVersion !== 1) {
    throw new TypeError("schemaVersion must be 1");
  }
  if (!isPlainObject(input.environment)) {
    throw new TypeError("environment must be an object");
  }

  const environment = {};
  for (const [key, value] of Object.entries(input.environment)) {
    if (!ALLOWED_ENVIRONMENT_KEYS.has(key)) {
      throw new TypeError(`environment.${key} is not supported`);
    }
    if (typeof value !== "string") {
      throw new TypeError(`environment.${key} must be a string`);
    }
    if (value.length > 8192) {
      throw new TypeError(`environment.${key} exceeds 8192 characters`);
    }
    if (value !== "" && PROXY_ENVIRONMENT_KEYS.has(key)) {
      const candidate = value.includes("://") ? value : `http://${value}`;
      try {
        const proxyUrl = new URL(candidate);
        if (!proxyUrl.hostname) {
          throw new TypeError("missing hostname");
        }
      } catch (error) {
        if (error instanceof TypeError) {
          throw new TypeError(`environment.${key} must be a proxy URL or host:port`);
        }
        throw error;
      }
    }
    environment[key] = value;
  }

  if (!Array.isArray(input.targets) || input.targets.length < 1 || input.targets.length > 500) {
    throw new TypeError("targets must contain between 1 and 500 entries");
  }

  return {
    schemaVersion: 1,
    environment,
    targets: input.targets.map(normalizeTarget),
  };
}
