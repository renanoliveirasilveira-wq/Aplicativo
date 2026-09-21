// Importa o texto da Bíblia Livre — BLIVRE, 2018 (domínio público, em
// português moderno) para a tabela local `versiculo_biblico`. Fonte:
// github.com/damarals/biblias (dataset marcado como domínio público,
// toolkit MIT). Trocamos da Almeida 1911 pra essa porque a Almeida 1911
// usa a ortografia portuguesa de antes de 1943 (ex.: "Christo",
// "condemnação"), que parece erro de digitação pra um leitor de hoje mas é
// só grafia antiga — a Bíblia Livre tem o mesmo domínio público, só que já
// em português atual. NÃO É a Almeida Revista e Corrigida (que tem
// direitos autorais da Sociedade Bíblica do Brasil — ver conversa sobre
// licenciamento). Rode de novo pra reimportar do zero (a tabela é limpa
// antes de cada importação).
//
//   node scripts/importar-biblia.mjs

import { createClient } from "@libsql/client";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Abreviação do dataset -> id canônico usado pelo app (ver
// src/lib/biblia/referencia.ts). Mantém o acento de "Jó" pra não colidir
// com a abreviação "Jo" de João.
const ID_POR_ABREV = {
  Gn: "gn",
  "Êx": "êx",
  Lv: "lv",
  Nm: "nm",
  Dt: "dt",
  Js: "js",
  Jz: "jz",
  Rt: "rt",
  "1Sm": "1sm",
  "2Sm": "2sm",
  "1Rs": "1rs",
  "2Rs": "2rs",
  "1Cr": "1cr",
  "2Cr": "2cr",
  Ed: "ed",
  Ne: "ne",
  Et: "et",
  "Jó": "jó",
  Sl: "sl",
  Pv: "pv",
  Ec: "ec",
  Ct: "ct",
  Is: "is",
  Jr: "jr",
  Lm: "lm",
  Ez: "ez",
  Dn: "dn",
  Os: "os",
  Jl: "jl",
  Am: "am",
  Ob: "ob",
  Jn: "jn",
  Mq: "mq",
  Na: "na",
  Hc: "hc",
  Sf: "sf",
  Ag: "ag",
  Zc: "zc",
  Ml: "ml",
  Mt: "mt",
  Mc: "mc",
  Lc: "lc",
  Jo: "jo",
  At: "at",
  Rm: "rm",
  "1Co": "1co",
  "2Co": "2co",
  Gl: "gl",
  Ef: "ef",
  Fp: "fp",
  Cl: "cl",
  "1Ts": "1ts",
  "2Ts": "2ts",
  "1Tm": "1tm",
  "2Tm": "2tm",
  Tt: "tt",
  Fm: "fm",
  Hb: "hb",
  Tg: "tg",
  "1Pe": "1pe",
  "2Pe": "2pe",
  "1Jo": "1jo",
  "2Jo": "2jo",
  "3Jo": "3jo",
  Jd: "jd",
  Ap: "ap",
};

async function main() {
  const jsonPath = path.join(
    __dirname,
    "..",
    "data",
    "biblia-import",
    "BLIVRE.json",
  );
  const livros = JSON.parse(await readFile(jsonPath, "utf8"));

  const client = createClient({
    url: process.env.DATABASE_URL ?? "file:./data/app.db",
  });

  await client.execute(`
    CREATE TABLE IF NOT EXISTS versiculo_biblico (
      livro TEXT NOT NULL,
      capitulo INTEGER NOT NULL,
      versiculo INTEGER NOT NULL,
      texto TEXT NOT NULL,
      PRIMARY KEY (livro, capitulo, versiculo)
    )
  `);

  await client.execute("DELETE FROM versiculo_biblico");

  let total = 0;
  for (const livro of livros) {
    const id = ID_POR_ABREV[livro.abbrev];
    if (!id) throw new Error(`Abreviação desconhecida no dataset: ${livro.abbrev}`);

    for (let c = 0; c < livro.chapters.length; c++) {
      const versiculos = livro.chapters[c];
      const batch = versiculos.map((texto, v) => ({
        sql: "INSERT INTO versiculo_biblico (livro, capitulo, versiculo, texto) VALUES (?, ?, ?, ?)",
        args: [id, c + 1, v + 1, texto.trim()],
      }));
      await client.batch(batch, "write");
      total += batch.length;
    }
    console.log(`Importado: ${livro.name} (${livro.chapters.length} capítulos)`);
  }

  console.log(`Concluído. ${total} versículos importados.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
