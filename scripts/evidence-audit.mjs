import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  lstatSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { dirname, extname, join, resolve, relative } from "node:path";
import { pathToFileURL } from "node:url";

const allowed = new Set([
  ".md",
  ".txt",
  ".csv",
  ".json",
  ".sql",
  ".png",
  ".jpg",
]);
const images = new Set([".png", ".jpg"]);
const excludedDirectory =
  /^(node_modules|\.git|\.next|dist|build|checkout-limpo|instalacao-limpa|.*coverage.*|cobertura|playwright-report|html|traces?|\.audit-private)$/;
const outputDirectory = "evidencias/PI4-34/34.2-evidencias-versionadas";
const expression = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const uriPattern = /postgres(?:ql)?:(?:\\?\/){2}[^\s"'`<>\\)\]]*/gi;
const jwtPattern = /\beyJ[A-Za-z0-9._-]{10,}/g;
const passwordPattern = /\bsenha[-_]sint[eé]tica[A-Za-z0-9._!\-]*/gi;
const assignmentPattern =
  /((?:\\?["'])?(?:X-Service-Token|BLOB_READ_WRITE_TOKEN|senha|password)(?:\\?["'])?\s*[:,=]\s*(?:\\?["']))([^"'\\\r\n]*)(\\?["'])/gi;

export function sensitivePatterns(options = {}) {
  return [
    { kind: "database-uri", source: uriPattern.source, flags: "gi" },
    { kind: "jwt", source: jwtPattern.source, flags: "g" },
    { kind: "session-cookie", source: "origem_sessao\\s*=", flags: "gi" },
    { kind: "service-credential", source: "X-Service-Token", flags: "gi" },
    {
      kind: "storage-credential",
      source: "BLOB_READ_WRITE_TOKEN",
      flags: "gi",
    },
    { kind: "synthetic-password", source: passwordPattern.source, flags: "gi" },
    ...(options.passwords ?? []).map((value) => ({
      kind: "synthetic-password",
      source: expression(value),
      flags: "g",
    })),
    ...(options.secrets ?? [])
      .filter((value) => value.length >= 8)
      .map((value) => ({
        kind: "known-secret",
        source: expression(value),
        flags: "g",
      })),
  ];
}

export function findSensitive(text, options = {}) {
  const findings = new Map();
  for (const rule of sensitivePatterns(options)) {
    const count = [...text.matchAll(new RegExp(rule.source, rule.flags))]
      .length;
    if (count) findings.set(rule.kind, (findings.get(rule.kind) ?? 0) + count);
  }
  for (const match of text.matchAll(new RegExp(assignmentPattern))) {
    if (!/^(?:\[.*\]|<.*>|undefined|null|false|true)$/i.test(match[2].trim()))
      findings.set(
        "credential-value",
        (findings.get("credential-value") ?? 0) + 1,
      );
  }
  return [...findings].map(([kind, count]) => ({ kind, count }));
}

export function sanitizeText(text, options = {}) {
  let clean = text
    .replace(uriPattern, "[BANCO_REMOVIDO]")
    .replace(jwtPattern, "[JWT_REMOVIDO]")
    .replace(/origem_sessao\s*=[^\s;"'`<>\\]*/gi, "[COOKIE_REMOVIDO]")
    .replace(assignmentPattern, "$1[CREDENCIAL_REMOVIDA]$3")
    .replace(
      /\b(?:X-Service-Token|BLOB_READ_WRITE_TOKEN)\s*[:=]\s*[^\s"'`<>\\;,}\]]+/gi,
      "CREDENCIAL=[REMOVIDA]",
    )
    .replace(/X-Service-Token/gi, "CABECALHO_DE_SERVICO")
    .replace(/BLOB_READ_WRITE_TOKEN/gi, "TOKEN_DE_ARMAZENAMENTO")
    .replace(passwordPattern, "[SENHA_REMOVIDA]");
  for (const value of [
    ...(options.passwords ?? []),
    ...(options.secrets ?? []),
  ].filter((value) => value.length >= 8))
    clean = clean.split(value).join("[CREDENCIAL_REMOVIDA]");
  return clean;
}

function loadSecrets(root) {
  const passwords = new Set();
  for (const file of [
    "backend/prisma/seeds/demo.ts",
    "frontend/src/fake-api/seeds/usuarios.seed.ts",
  ]) {
    if (!existsSync(join(root, file))) continue;
    for (const match of readFileSync(join(root, file), "utf8").matchAll(
      /\bsenha\s*:\s*["']([^"']+)["']/g,
    ))
      passwords.add(match[1]);
  }
  const secrets = new Set();
  for (const file of [
    "backend/.env",
    ".env",
    ".env.compose",
    "services/recomendacao/.env",
  ]) {
    if (!existsSync(join(root, file))) continue;
    for (const line of readFileSync(join(root, file), "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match) continue;
      const value = match[2].replace(/^(["'])(.*)\1$/, "$2");
      if (/(SECRET|TOKEN|PASSWORD|SENHA)/.test(match[1]) && value.length >= 8)
        secrets.add(value);
      if (/(DATABASE_URL|DIRECT_URL)/.test(match[1])) {
        try {
          const password = decodeURIComponent(new URL(value).password);
          if (password.length >= 8) secrets.add(password);
        } catch {}
      }
    }
  }
  return { passwords: [...passwords], secrets: [...secrets] };
}

export function candidateFiles(root) {
  const paths = execFileSync(
    "git",
    [
      "-c",
      "core.longpaths=true",
      "ls-files",
      "-z",
      "--cached",
      "--others",
      "--exclude-standard",
      "--",
      "evidencias/",
    ],
    {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 32 * 1024 * 1024,
    },
  )
    .split("\0")
    .filter(Boolean);
  return [...new Set(paths)]
    .filter((path) => allowed.has(extname(path)))
    .sort()
    .map((path) => {
      if (
        !allowed.has(extname(path)) ||
        path.split("/").some((part) => excludedDirectory.test(part)) ||
        /\.env/i.test(path) ||
        /(?:^|\/)trace[.-]/.test(path)
      )
        throw new Error(`Artefato fora da politica: ${path}`);
      const full = resolve(root, path);
      if (
        !full.startsWith(resolve(root, "evidencias") + "/") &&
        !full.startsWith(resolve(root, "evidencias") + "\\")
      )
        throw new Error("Caminho fora de evidencias");
      if (lstatSync(full).isSymbolicLink())
        throw new Error("Link simbolico nao permitido em evidencias");
      const metadata = statSync(full);
      return {
        path,
        bytes: metadata.size,
        sha256: createHash("sha256").update(readFileSync(full)).digest("hex"),
      };
    });
}

function decode(buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xfe)
    return {
      text: buffer.subarray(2).toString("utf16le"),
      encoding: "utf16le",
      prefix: Buffer.from([0xff, 0xfe]),
    };
  try {
    return {
      text: new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
        buffer,
      ),
      encoding: "utf8",
      prefix: Buffer.alloc(0),
    };
  } catch {
    return {
      text: buffer.toString("latin1"),
      encoding: "latin1",
      prefix: Buffer.alloc(0),
    };
  }
}

export function auditTextFiles(root, files, options, sanitize = false) {
  const findings = [];
  let scanned = 0;
  for (const file of files) {
    if (images.has(extname(file.path))) continue;
    scanned += 1;
    const full = join(root, file.path);
    const original = decode(readFileSync(full));
    const matches = findSensitive(original.text, options);
    if (!matches.length) continue;
    const clean = sanitizeText(original.text, options);
    if (sanitize) {
      if (findSensitive(clean, options).length)
        throw new Error(`Anonimizacao incompleta: ${file.path}`);
      if (extname(file.path) === ".json") {
        let validBefore = true;
        try {
          JSON.parse(original.text.replace(/^\uFEFF/, ""));
        } catch {
          validBefore = false;
        }
        if (validBefore) JSON.parse(clean.replace(/^\uFEFF/, ""));
      }
      writeFileSync(
        full,
        Buffer.concat([original.prefix, Buffer.from(clean, original.encoding)]),
      );
    }
    findings.push({ path: file.path, findings: matches, sanitized: sanitize });
  }
  return { scanned, affected: findings.length, findings };
}

function auditIndex(root, options) {
  const paths = execFileSync(
    "git",
    ["-c", "core.longpaths=true", "ls-files", "-z", "--", "evidencias/"],
    { cwd: root, encoding: "utf8", windowsHide: true },
  )
    .split("\0")
    .filter(Boolean);
  if (paths.some((path) => !allowed.has(extname(path))))
    throw new Error("Indice contem extensao nao permitida");
  const output = execFileSync(
    "git",
    ["-c", "core.longpaths=true", "cat-file", "--batch"],
    {
      cwd: root,
      input: paths.map((path) => `:${path}\n`).join(""),
      windowsHide: true,
      maxBuffer: 128 * 1024 * 1024,
    },
  );
  const ocr = JSON.parse(
    readFileSync(join(root, outputDirectory, "ocr-review.json"), "utf8"),
  );
  const findings = [];
  let cursor = 0;
  for (const path of paths) {
    const end = output.indexOf(10, cursor);
    const header = output.subarray(cursor, end).toString("utf8").split(" ");
    if (header[1] !== "blob" || !Number.isSafeInteger(Number(header[2])))
      throw new Error("Objeto de indice invalido");
    const size = Number(header[2]);
    const contents = output.subarray(end + 1, end + 1 + size);
    cursor = end + size + 2;
    if (images.has(extname(path))) {
      const hash = createHash("sha256").update(contents).digest("hex");
      const record = ocr.findings.find(
        (file) => file.path === path && file.sha256 === hash,
      );
      if (!record || record.status !== "ok" || record.findings.length)
        findings.push({
          path,
          findings: [{ kind: "image-unverified", count: 1 }],
        });
    } else {
      const matches = findSensitive(decode(contents).text, options);
      if (matches.length) findings.push({ path, findings: matches });
    }
  }
  return { scanned: paths.length, affected: findings.length, findings };
}

function walk(directory, skipBuilds = false) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!skipBuilds || !excludedDirectory.test(entry.name))
        files.push(...walk(full, skipBuilds));
    } else if (entry.isFile()) files.push(full);
  }
  return files;
}

function inventory(root, candidates) {
  const all = walk(join(root, "evidencias"));
  const folders = new Map();
  const extensions = new Map();
  let bytes = 0;
  for (const file of all) {
    const size = statSync(file).size;
    bytes += size;
    const folder = relative(join(root, "evidencias"), file).split(/[\\/]/)[0];
    for (const [map, key] of [
      [folders, folder],
      [extensions, extname(file) || "sem-extensao"],
    ]) {
      const item = map.get(key) ?? { name: key, files: 0, bytes: 0 };
      item.files += 1;
      item.bytes += size;
      map.set(key, item);
    }
  }
  const videos = walk(join(root, "evidencias"), true)
    .filter(
      (file) =>
        [".mp4", ".webm"].includes(extname(file)) ||
        (extname(file) === ".gif" && statSync(file).size > 5 * 1024 * 1024),
    )
    .map((file) => ({
      path: relative(root, file).replaceAll("\\", "/"),
      bytes: statSync(file).size,
    }));
  return {
    total: { files: all.length, bytes },
    folders: [...folders.values()].sort((a, b) => b.bytes - a.bytes),
    extensions: [...extensions.values()].sort((a, b) => b.bytes - a.bytes),
    selected: {
      files: candidates.length,
      bytes: candidates.reduce((sum, file) => sum + file.bytes, 0),
    },
    videos,
  };
}

export function rewriteLogLinks(root, paths) {
  const changed = [];
  for (const path of paths) {
    const full = join(root, path);
    const original = decode(readFileSync(full));
    const updated = original.text.replace(
      /\[([^\]]*)\]\(([^)\n]+\.log)\)/g,
      (match, label, target) => {
        const destination = resolve(
          dirname(full),
          target.slice(0, -4) + ".txt",
        );
        return destination.startsWith(resolve(root, "evidencias")) &&
          existsSync(destination)
          ? `[${label.replace(/\.log$/, ".txt")}](${target.slice(0, -4)}.txt)`
          : match;
      },
    );
    if (updated !== original.text) {
      writeFileSync(
        full,
        Buffer.concat([
          original.prefix,
          Buffer.from(updated, original.encoding),
        ]),
      );
      changed.push(path);
    }
  }
  return changed;
}

export function normalizeLogs(root, options = {}) {
  const copied = [];
  for (const file of walk(join(root, "evidencias"), true).filter(
    (file) => extname(file) === ".log",
  )) {
    const destination = file.slice(0, -4) + ".txt";
    const source = readFileSync(file);
    if (existsSync(destination)) {
      const existing = readFileSync(destination);
      if (
        !existing.equals(source) &&
        decode(existing).text !== sanitizeText(decode(source).text, options)
      )
        throw new Error("Copia de log ja existe com conteudo diferente");
    } else writeFileSync(destination, source, { flag: "wx" });
    copied.push({
      original: relative(root, file).replaceAll("\\", "/"),
      published: relative(root, destination).replaceAll("\\", "/"),
    });
  }
  rewriteLogLinks(
    root,
    candidateFiles(root)
      .filter((file) => extname(file.path) === ".md")
      .map((file) => file.path),
  );
  return { copied: copied.length, files: copied };
}

export function applyImageReviews(result, reviews) {
  const findings = result.findings.map((file) => {
    const all = [...file.findings, ...(file.reviewedFindings ?? [])];
    const review = reviews.find(
      (item) => item.path === file.path && item.sha256 === file.sha256,
    );
    const reviewedFindings = all.filter(
      (finding) =>
        review &&
        ["service-credential", "storage-credential"].includes(finding.kind) &&
        review.labelOnly.includes(finding.kind),
    );
    return {
      ...file,
      findings: all.filter((finding) => !reviewedFindings.includes(finding)),
      reviewedFindings,
    };
  });
  return {
    ...result,
    affected: findings.filter((file) => file.findings.length).length,
    reviewed: findings.filter((file) => file.reviewedFindings.length).length,
    findings,
  };
}

function save(root, path, data) {
  const full = resolve(root, path);
  if (
    !full.startsWith(resolve(root, "evidencias") + "/") &&
    !full.startsWith(resolve(root, "evidencias") + "\\")
  )
    throw new Error("Relatorio fora de evidencias");
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, JSON.stringify(data, null, 2) + "\n");
}

function main() {
  const root = process.cwd();
  const command = process.argv[2];
  const files = candidateFiles(root);
  const options = loadSecrets(root);
  const reportArgument = process.argv.indexOf("--report");
  const report =
    reportArgument < 0
      ? `${outputDirectory}/${command}.json`
      : process.argv[reportArgument + 1];
  let result;
  if (command === "inventory") result = inventory(root, files);
  else if (command === "normalize") result = normalizeLogs(root, options);
  else if (command === "links") {
    const paths = execFileSync("git", ["ls-files", "-z", "--", "*.md"], {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
    })
      .split("\0")
      .filter(Boolean);
    result = { changed: rewriteLogLinks(root, paths) };
  } else if (command === "scan" || command === "sanitize")
    result = auditTextFiles(root, files, options, command === "sanitize");
  else if (command === "scan-index") result = auditIndex(root, options);
  else if (command === "ocr" || command === "ocr-review") {
    const selected = files.filter((file) => images.has(extname(file.path)));
    if (command === "ocr-review") {
      result = JSON.parse(
        readFileSync(join(root, outputDirectory, "ocr.json"), "utf8"),
      );
      if (
        selected.some(
          (file) =>
            !result.findings.some(
              (item) => item.path === file.path && item.sha256 === file.sha256,
            ),
        )
      )
        throw new Error("OCR desatualizado");
      result.findings = result.findings.filter((item) =>
        selected.some(
          (file) => file.path === item.path && file.sha256 === item.sha256,
        ),
      );
      result.scanned = selected.length;
      result.uniqueScanned = new Set(selected.map((file) => file.sha256)).size;
      result.errors = result.findings.filter(
        (item) => item.status !== "ok",
      ).length;
    } else {
      const script = join(root, "scripts/evidence-ocr.ps1").replaceAll(
        "'",
        "''",
      );
      const output = execFileSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          `& ([ScriptBlock]::Create([IO.File]::ReadAllText('${script}')))`,
        ],
        {
          cwd: root,
          input: JSON.stringify({
            root,
            files: selected,
            patterns: sensitivePatterns(options),
          }),
          encoding: "utf8",
          windowsHide: true,
          maxBuffer: 8 * 1024 * 1024,
          timeout: 15 * 60 * 1000,
        },
      );
      result = JSON.parse(output.replace(/^\uFEFF/, ""));
    }
    const reviewFile = join(root, outputDirectory, "image-reviews.json");
    result = applyImageReviews(
      result,
      existsSync(reviewFile)
        ? JSON.parse(readFileSync(reviewFile, "utf8"))
        : [],
    );
  } else throw new Error("Use inventory, normalize, scan, sanitize ou ocr");
  save(root, report, result);
  if (command === "inventory")
    console.log(
      JSON.stringify({
        files: result.selected.files,
        bytes: result.selected.bytes,
        totalBytes: result.total.bytes,
        videos: result.videos.length,
        report,
      }),
    );
  else
    console.log(
      JSON.stringify({
        scanned: result.scanned,
        affected: result.affected,
        copied: result.copied,
        errors: result.errors ?? 0,
        report,
      }),
    );
  if (
    (command.startsWith("scan") || command.startsWith("ocr")) &&
    (result.affected || result.errors)
  )
    process.exitCode = 1;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    main();
  } catch {
    console.error(
      "Falha na auditoria de evidencias; nenhum segredo foi exibido.",
    );
    process.exitCode = 1;
  }
}
