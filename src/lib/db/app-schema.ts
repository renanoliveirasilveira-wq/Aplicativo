import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  primaryKey,
} from "drizzle-orm/sqlite-core";

import { user } from "./schema";

export const conversa = sqliteTable(
  "conversa",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    titulo: text("titulo").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [index("conversa_userId_idx").on(table.userId)],
);

export const mensagem = sqliteTable(
  "mensagem",
  {
    id: text("id").primaryKey(),
    conversaId: text("conversa_id")
      .notNull()
      .references(() => conversa.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["user", "assistant"] }).notNull(),
    conteudo: text("conteudo", { mode: "json" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [index("mensagem_conversaId_idx").on(table.conversaId)],
);

export const usoDiario = sqliteTable(
  "uso_diario",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Data local (America/Sao_Paulo) no formato YYYY-MM-DD.
    data: text("data").notNull(),
    custoUsd: real("custo_usd").notNull().default(0),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.data] })],
);

// Texto da Bíblia Almeida 1911 (edição de 1911, domínio público — não é a
// Almeida Revista e Corrigida de 1995, que é protegida). Importado via
// scripts/importar-biblia.mjs a partir de github.com/damarals/biblias
// (toolkit MIT, dataset marcado como domínio público). Guardado localmente
// pra IA nunca precisar reproduzir o texto do versículo — ela só cita a
// referência, e o app busca o texto aqui.
export const versiculoBiblico = sqliteTable(
  "versiculo_biblico",
  {
    // id canônico do livro (ex.: "gn", "jo", "1co") — ver src/lib/biblia/referencia.ts
    livro: text("livro").notNull(),
    capitulo: integer("capitulo").notNull(),
    versiculo: integer("versiculo").notNull(),
    texto: text("texto").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.livro, table.capitulo, table.versiculo],
    }),
  ],
);

// Contextualização MACRO de cada um dos 66 livros ("Sobre este livro") —
// gerada uma única vez (ver scripts/gerar-contexto-livros.mjs), não a cada
// pergunta. Esse conteúdo é o mesmo pra qualquer versículo pesquisado
// dentro do mesmo livro, então gerar de novo a cada mensagem era gasto
// puro de tokens de saída.
export const contextoLivro = sqliteTable("contexto_livro", {
  // id canônico do livro (ex.: "gn", "jo", "1co") — ver src/lib/biblia/referencia.ts
  livro: text("livro").primaryKey(),
  contextoGeral: text("contexto_geral").notNull(),
  contextoLiterario: text("contexto_literario").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

// Cache de análises "analise_completa" já geradas, por referência exata
// (ver src/lib/biblia/cache-analise.ts). Quando um aluno pergunta uma
// referência que já foi perguntada antes (por ele ou por outro aluno), o
// app reaproveita a análise salva aqui em vez de chamar a IA de novo — a
// referência exata em si não muda de resposta entre alunos, então não faz
// sentido pagar pra gerar de novo. `versaoPrompt` permite invalidar tudo de
// uma vez quando as instruções da IA mudam (ver VERSAO_PROMPT em
// chat.functions.ts).
export const analiseCache = sqliteTable("analise_cache", {
  // referência canônica (livro:capítulo:versículoInicio-versículoFim) —
  // ver chaveCanonica() em src/lib/biblia/referencia.ts
  chave: text("chave").primaryKey(),
  versaoPrompt: integer("versao_prompt").notNull(),
  // AnaliseContextualIa (passo_1_contexto específico do trecho + passo_2) —
  // não inclui texto bíblico nem o bloco "Sobre este livro", que são
  // buscados à parte e sempre atualizados.
  dados: text("dados", { mode: "json" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

// Mensagens fixas usadas no lugar de texto gerado pela IA, pra pedidos que
// não precisam (e não devem) gastar tokens de saída — ex.: pedido de
// interpretação ou algo fora do escopo do aplicativo. A IA só sinaliza o
// tipo do pedido; o texto em si vem daqui (ver src/lib/mensagens-padrao.ts).
export const mensagemPadrao = sqliteTable("mensagem_padrao", {
  chave: text("chave").primaryKey(),
  texto: text("texto").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});
