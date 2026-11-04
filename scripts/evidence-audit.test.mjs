import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  findSensitive,
  sanitizeText,
  applyImageReviews,
  auditTextFiles,
  normalizeLogs,
} from "./evidence-audit.mjs";

let temporary;
const cases = [
  ["evidencias/relatorio.md", true],
  ["evidencias/entrega/saida.txt", true],
  ["evidencias/entrega/medicoes.csv", true],
  ["evidencias/entrega/resultado.json", true],
  ["evidencias/entrega/consulta.sql", true],
  ["evidencias/entrega/tela.png", true],
  ["evidencias/entrega/tela.jpg", true],
  ["evidencias/entrega/trace.zip", false],
  ["evidencias/entrega/trace.json", false],
  ["evidencias/entrega/traces/resultado.json", false],
  ["evidencias/entrega/video.webm", false],
  ["evidencias/entrega/video.mp4", false],
  ["evidencias/entrega/animacao.gif", false],
  ["evidencias/entrega/.env.json", false],
  ["evidencias/entrega/copia.env.txt", false],
  ["evidencias/entrega/playwright-report/data/tela.png", false],
  ["evidencias/entrega/html/data/tela.png", false],
  ["evidencias/entrega/coverage/resultado.json", false],
  ["evidencias/entrega/backend-coverage/cobertura/coverage-final.json", false],
  ["evidencias/entrega/frontend-coverage/vitest.json", false],
  ["evidencias/entrega/checkout-limpo/package.json", false],
  ["evidencias/entrega/instalacao-limpa/package.json", false],
  ["evidencias/entrega/node_modules/pkg/package.json", false],
  ["evidencias/entrega/.next/cache/resultado.json", false],
  ["evidencias/.audit-private/resultado.json", false],
];

before(() => {
  temporary = mkdtempSync(join(tmpdir(), "origem-evidence-policy-"));
  execFileSync("git", ["init", "--quiet", temporary], { windowsHide: true });
  writeFileSync(
    join(temporary, ".gitignore"),
    readFileSync(new URL("../.gitignore", import.meta.url)),
  );
  for (const [path] of cases) {
    mkdirSync(dirname(join(temporary, path)), { recursive: true });
    writeFileSync(join(temporary, path), "artefato sintetico\n");
  }
});
after(() => {
  if (temporary) rmSync(temporary, { recursive: true, force: true });
});

for (const [path, expected] of cases) {
  test(`politica Git ${expected ? "inclui" : "exclui"} ${path}`, () => {
    const files = execFileSync(
      "git",
      ["ls-files", "--others", "--exclude-standard", "-z", "--", "evidencias"],
      {
        cwd: temporary,
        encoding: "utf8",
        windowsHide: true,
      },
    ).split("\0");
    assert.equal(files.includes(path), expected);
  });
}

test("anonimiza URLs, credenciais e cookies sem invalidar JSON", () => {
  const source = JSON.stringify({
    database: "postgresql://fake:fake@localhost/demo",
    alternate: "postgres://fake:fake@localhost/demo",
    jwt: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzaW50ZXRpY28ifQ.assinatura_sintetica",
    cookie: "origem_sessao=valor-sintetico; Path=/; HttpOnly",
    "X-Service-Token": "valor-cabecalho-sintetico",
    BLOB_READ_WRITE_TOKEN: "valor-storage-sintetico",
    senha: "senha-sintetica-admin",
    password: "outro-valor-sintetico",
    total: 35,
  });
  const sanitized = sanitizeText(source);
  assert.equal(JSON.parse(sanitized).total, 35);
  assert.deepEqual(findSensitive(sanitized), []);
  for (const value of [
    "fake@localhost",
    "valor-sintetico",
    "valor-cabecalho-sintetico",
    "valor-storage-sintetico",
    "outro-valor-sintetico",
  ])
    assert.equal(sanitized.includes(value), false);
});

test("anonimiza JSON serializado dentro de logs e comandos", () => {
  const source = JSON.stringify({
    log: 'headers: {"X-Service-Token": "credencial-sintetica"}; origem_sessao=teste; postgres:\\/\\/fake:fake@localhost/db',
  });
  const sanitized = sanitizeText(source);
  assert.doesNotThrow(() => JSON.parse(sanitized));
  assert.deepEqual(findSensitive(sanitized), []);
  assert.equal(sanitized.includes("credencial-sintetica"), false);
});

test("detecta senhas conhecidas fora de campos nomeados", () => {
  const options = {
    passwords: ["senha-da-conta-de-teste"],
    secrets: ["segredo-exclusivo-de-teste"],
  };
  const source = "senha-da-conta-de-teste segredo-exclusivo-de-teste";
  assert.equal(findSensitive(source, options).length, 2);
  assert.deepEqual(findSensitive(sanitizeText(source, options), options), []);
});

test("nao altera contagens, hashes e placeholders anonimizados", () => {
  const source =
    '{"total":35,"senha":"[CREDENCIAL_REMOVIDA]","sha256":"ab1234"}';
  assert.deepEqual(findSensitive(source), []);
  assert.equal(sanitizeText(source), source);
});

test("revisao visual vale somente para o hash exato e rotulos", () => {
  const result = {
    scanned: 1,
    affected: 1,
    errors: 0,
    findings: [
      {
        path: "evidencias/imagem.jpg",
        sha256: "hash-atual",
        findings: [
          { kind: "storage-credential", count: 1 },
          { kind: "jwt", count: 1 },
        ],
      },
    ],
  };
  const reviews = [
    {
      path: "evidencias/imagem.jpg",
      sha256: "hash-antigo",
      labelOnly: ["storage-credential", "jwt"],
    },
  ];
  assert.equal(
    applyImageReviews(result, reviews).findings[0].findings.length,
    2,
  );
  reviews[0].sha256 = "hash-atual";
  const reviewed = applyImageReviews(result, reviews);
  assert.deepEqual(reviewed.findings[0].findings, [{ kind: "jwt", count: 1 }]);
  assert.equal(reviewed.affected, 1);
});

test("anonimiza logs UTF-16 preservando codificacao e contagens", () => {
  const path = "evidencias/entrega/windows.txt";
  const source = "postgresql://fake:fake@localhost/demo\r\nTotal: 35\r\n";
  writeFileSync(
    join(temporary, path),
    Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(source, "utf16le")]),
  );
  const result = auditTextFiles(temporary, [{ path }], {}, true);
  assert.equal(result.affected, 1);
  const saved = readFileSync(join(temporary, path));
  assert.equal(saved.readUInt16LE(0), 0xfeff);
  assert.equal(
    saved.subarray(2).toString("utf16le"),
    "[BANCO_REMOVIDO]\r\nTotal: 35\r\n",
  );
});

test("converte log sem apagar original nem restaurar credenciais", () => {
  const original = join(temporary, "evidencias/entrega/original.log");
  writeFileSync(original, "postgres://fake:fake@localhost/demo\n");
  normalizeLogs(temporary);
  auditTextFiles(
    temporary,
    [{ path: "evidencias/entrega/original.txt" }],
    {},
    true,
  );
  assert.doesNotThrow(() => normalizeLogs(temporary));
  assert.equal(
    readFileSync(original, "utf8"),
    "postgres://fake:fake@localhost/demo\n",
  );
  assert.equal(
    readFileSync(original.slice(0, -4) + ".txt", "utf8"),
    "[BANCO_REMOVIDO]\n",
  );
});
