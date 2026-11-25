const palavra = /[A-Za-z0-9_$\P{ASCII}]+/uy;
const separador = /\s+/y;
const tag = /\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/y;
const naoAscii = /\P{ASCII}/u;

function escapeUnicodeNaoAscii(identificador: string, sufixo: string) {
  const escape = /^\s*UESCAPE\s*'(.)'/i.exec(sufixo)?.[1] ?? "\\";
  for (let i = 0; i < identificador.length; i++) {
    if (identificador[i] !== escape) continue;
    if (identificador[i + 1] === escape) {
      i++;
      continue;
    }
    const codigo = /^(?:\+([0-9a-f]{6})|([0-9a-f]{4}))/i.exec(
      identificador.slice(i + 1),
    );
    if (codigo && parseInt(codigo[1] ?? codigo[2] ?? "", 16) > 127) return true;
  }
  return false;
}

function fimComentario(sql: string, inicio: number): number {
  let nivel = 1;
  let pos = inicio + 2;
  while (nivel && pos < sql.length) {
    if (sql.startsWith("/*", pos)) {
      nivel++;
      pos += 2;
    } else if (sql.startsWith("*/", pos)) {
      nivel--;
      pos += 2;
    } else pos++;
  }
  return pos;
}

function fimAspas(
  sql: string,
  inicio: number,
  aspas: string,
  escape: boolean,
): number {
  let pos = inicio + 1;
  while (pos < sql.length) {
    if (escape && sql[pos] === "\\") {
      pos += 2;
      continue;
    }
    if (sql[pos++] !== aspas) continue;
    if (sql[pos] !== aspas) break;
    pos++;
  }
  return pos;
}

export function verificarD11(sql: string): string[] {
  const erros = new Set<string>();
  if (sql.startsWith("\uFEFF")) erros.add("BOM UTF-8");
  const pos = sql.startsWith("\uFEFF") ? 1 : 0;
  let cabecalho = true;
  let fimCabecalho = pos;
  let anterior = "";
  function examinar(inicio: number, limite: number) {
    let i = inicio;
    while (i < limite) {
      separador.lastIndex = i;
      if (separador.test(sql)) {
        i = separador.lastIndex;
        continue;
      }
      if (sql.startsWith("--", i)) {
        const fim = sql.indexOf("\n", i + 2);
        i = fim < 0 ? limite : fim + 1;
        continue;
      }
      if (sql.startsWith("/*", i)) {
        i = fimComentario(sql, i);
        continue;
      }
      if (cabecalho) {
        fimCabecalho = i;
        cabecalho = false;
      }
      const ch = sql.charAt(i);
      if (ch === "'" || ch === '"') {
        const fim = fimAspas(
          sql,
          i,
          ch,
          ch === "'" && anterior === "E" && sql[i - 1]?.toUpperCase() === "E",
        );
        if (ch === '"') {
          const identificador = sql.slice(i + 1, fim - 1);
          const unicode =
            sql.slice(Math.max(0, i - 2), i).toUpperCase() === "U&";
          if (
            naoAscii.test(identificador) ||
            (unicode && escapeUnicodeNaoAscii(identificador, sql.slice(fim)))
          )
            erros.add("identificador não ASCII");
        }
        i = fim;
        anterior = "";
        continue;
      }
      tag.lastIndex = i;
      const delimitador = ch === "$" ? tag.exec(sql)?.[0] : undefined;
      if (delimitador) {
        const corpo = i + delimitador.length;
        const fim = sql.indexOf(delimitador, corpo);
        if (fim < 0) {
          erros.add("delimitador SQL incompleto");
          break;
        }
        if (anterior === "DO" || anterior === "AS") {
          anterior = "";
          examinar(corpo, fim);
        }
        i = fim + delimitador.length;
        anterior = "";
        continue;
      }
      if (sql.startsWith("::", i)) {
        i += 2;
        anterior = "";
        continue;
      }
      if (ch === "\\") erros.add("metacomando psql");
      if (ch === ":" && /[A-Za-z0-9_'"\u0080-\uFFFF{]/u.test(sql.charAt(i + 1)))
        erros.add("variável psql");
      palavra.lastIndex = i;
      const token = palavra.exec(sql)?.[0];
      if (token) {
        if (naoAscii.test(token)) erros.add("identificador não ASCII");
        if (anterior === "CREATE" && token.toUpperCase() === "EXTENSION")
          erros.add("CREATE EXTENSION");
        anterior = token.toUpperCase();
        i = palavra.lastIndex;
      } else {
        anterior = ch;
        i++;
      }
    }
  }
  examinar(pos, sql.length);
  if (
    !/\bPostgreSQL\s+13\b/i.test(
      sql.slice(pos, cabecalho ? sql.length : fimCabecalho),
    )
  )
    erros.add("cabeçalho PostgreSQL 13");
  return [...erros];
}
