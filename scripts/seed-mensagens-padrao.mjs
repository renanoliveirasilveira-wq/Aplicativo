// Semeia (ou atualiza) as mensagens fixas usadas no lugar de texto gerado
// pela IA — ver src/lib/db/app-schema.ts (tabela mensagem_padrao) e
// src/lib/mensagens-padrao.ts.
//
//   node scripts/seed-mensagens-padrao.mjs

import { createClient } from "@libsql/client";

const MENSAGENS = {
  fora_do_escopo: `Nossa ferramenta foi pensada pra caminhar junto com você no método Ajuste Interpretativo, com as próprias mãos — não pra te entregar uma interpretação pronta.

A proposta é simples: você me manda uma referência bíblica ou uma pergunta, e eu te devolvo contexto — histórico, cultural, do livro — pra você mesmo chegar à sua compreensão.

Tenta reformular focando nesse tipo de informação (por exemplo: "qual o contexto histórico desse texto?"). Fico à disposição pra te ajudar!`,
};

async function main() {
  const client = createClient({
    url: process.env.DATABASE_URL ?? "file:./data/app.db",
  });

  await client.execute(`
    CREATE TABLE IF NOT EXISTS mensagem_padrao (
      chave TEXT PRIMARY KEY,
      texto TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
    )
  `);

  for (const [chave, texto] of Object.entries(MENSAGENS)) {
    await client.execute({
      sql: `INSERT INTO mensagem_padrao (chave, texto) VALUES (?, ?)
            ON CONFLICT (chave) DO UPDATE SET
              texto = excluded.texto,
              updated_at = cast(unixepoch('subsecond') * 1000 as integer)`,
      args: [chave, texto],
    });
    console.log(`OK: ${chave}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
