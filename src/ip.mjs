import { isIP } from "node:net";

function parseIpv4(address) {
  const octets = address.split(".").map(Number);
  let value = 0n;
  for (const octet of octets) {
    value = (value << 8n) | BigInt(octet);
  }
  return { family: 4, bits: 32, value };
}

function replaceIpv4Tail(address) {
  const lastColon = address.lastIndexOf(":");
  const tail = address.slice(lastColon + 1);
  if (isIP(tail) !== 4) {
    return address;
  }

  const octets = tail.split(".").map(Number);
  const high = ((octets[0] << 8) | octets[1]).toString(16);
  const low = ((octets[2] << 8) | octets[3]).toString(16);
  return `${address.slice(0, lastColon + 1)}${high}:${low}`;
}

function parseIpv6(address) {
  const normalized = replaceIpv4Tail(address.toLowerCase());
  const halves = normalized.split("::");
  if (halves.length > 2) {
    throw new TypeError(`Invalid IP address: ${address}`);
  }

  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if ((halves.length === 1 && missing !== 0) || (halves.length === 2 && missing < 1)) {
    throw new TypeError(`Invalid IP address: ${address}`);
  }

  const words = [...head, ...Array(missing).fill("0"), ...tail];
  if (
    words.length !== 8 ||
    words.some((word) => !/^[0-9a-f]{1,4}$/i.test(word))
  ) {
    throw new TypeError(`Invalid IP address: ${address}`);
  }

  let value = 0n;
  for (const word of words) {
    value = (value << 16n) | BigInt(`0x${word}`);
  }
  return { family: 6, bits: 128, value };
}

export function parseIp(address) {
  const family = isIP(address);
  if (family === 4) {
    return parseIpv4(address);
  }
  if (family === 6) {
    return parseIpv6(address);
  }
  throw new TypeError(`Invalid IP address: ${address}`);
}

export function cidrContains(address, cidr) {
  const slash = cidr.lastIndexOf("/");
  if (slash < 1) {
    throw new TypeError(`Invalid CIDR: ${cidr}`);
  }

  const network = parseIp(cidr.slice(0, slash));
  const prefixText = cidr.slice(slash + 1);
  if (!/^\d+$/.test(prefixText)) {
    throw new TypeError(`Invalid CIDR: ${cidr}`);
  }
  const prefix = Number(prefixText);
  if (prefix > network.bits) {
    throw new TypeError(`Invalid CIDR: ${cidr}`);
  }

  const candidate = parseIp(address);
  if (candidate.family !== network.family) {
    return false;
  }

  const shift = BigInt(network.bits - prefix);
  return candidate.value >> shift === network.value >> shift;
}

export function isLoopbackIp(address) {
  const parsed = parseIp(address);
  if (parsed.family === 4) {
    return parsed.value >> 24n === 127n;
  }
  return parsed.value === 1n;
}
