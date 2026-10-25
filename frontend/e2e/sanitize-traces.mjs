import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { TextDecoder } from "node:util";
import { zipSync, unzipSync, strToU8 } from "fflate";

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function sanitizeTraceZip(bytes) {
  const files = unzipSync(bytes);
  const texts = new Map();
  const secrets = new Set();
  const sensitive =
    /^(senha|senhaHash|password|token|accessToken|refreshToken|authorization|cookie|set-cookie|origem_sessao)$/i;
  const add = (value) => {
    if (
      typeof value === "string" &&
      value.length > 3 &&
      value !== "[REDACTED]"
    ) {
      secrets.add(value);
      secrets.add(JSON.stringify(value).slice(1, -1));
    }
  };
  const collect = (value) => {
    if (typeof value === "string") {
      for (const match of value.matchAll(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g))
        add(match[0]);
      if (value.startsWith("{") || value.startsWith("["))
        collect(parseJson(value));
    } else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === "object") {
      if (typeof value.name === "string" && sensitive.test(value.name))
        add(value.value);
      const selector = value.selector ?? value.locator;
      if (typeof selector === "string" && /senha|password/i.test(selector))
        add(value.value);
      for (const [key, item] of Object.entries(value)) {
        if (sensitive.test(key)) add(item);
        collect(item);
      }
    }
  };
  for (const [name, data] of Object.entries(files)) {
    if (name.startsWith("resources/src@") || name.startsWith("src/")) {
      delete files[name];
      continue;
    }
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(data);
      texts.set(name, text);
      for (const line of text.split("\n")) {
        collect(parseJson(line));
      }
    } catch {
      continue;
    }
  }
  for (const [name, text] of texts) {
    let cleaned = text;
    for (const secret of [...secrets].sort((a, b) => b.length - a.length))
      cleaned = cleaned.replaceAll(secret, "[REDACTED]");
    if (cleaned !== text) files[name] = strToU8(cleaned);
  }
  return zipSync(files);
}

export function sanitizeArtifacts(root) {
  let count = 0;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) count += sanitizeArtifacts(path);
    else if (entry.name.endsWith(".zip")) {
      writeFileSync(path, sanitizeTraceZip(readFileSync(path)));
      count++;
    }
  }
  return count;
}
