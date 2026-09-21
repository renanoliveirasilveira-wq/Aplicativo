// Gera, uma única vez por livro, o bloco "Sobre este livro"
// (contexto_geral_do_livro + contexto_literario_do_livro) pros 66 livros da
// Bíblia, e guarda na tabela local `contexto_livro`. Esse conteúdo é o
// mesmo pra qualquer versículo pesquisado dentro do mesmo livro, então
// gerar de novo a cada mensagem do chat era gasto puro de tokens de saída
// — ver src/lib/biblia/enriquecer.ts, que busca esse conteúdo aqui em vez
// de pedir pra IA gerar.
//
//   node scripts/gerar-contexto-livros.mjs            # gera os 66 livros
//   node scripts/gerar-contexto-livros.mjs "Gênesis"  # regera só um livro
//     (nome como aparece na lista LIVROS abaixo)

import { createClient } from "@libsql/client";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function carregarEnv() {
  try {
    const conteudo = await readFile(path.join(__dirname, "..", ".env"), "utf8");
    for (const linha of conteudo.split("\n")) {
      const trimmed = linha.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const igual = trimmed.indexOf("=");
      if (igual === -1) continue;
      const chave = trimmed.slice(0, igual).trim();
      const valor = trimmed.slice(igual + 1).trim();
      if (!(chave in process.env)) process.env[chave] = valor;
    }
  } catch {
    // sem .env — assume que as vars já estão no ambiente
  }
}

// Mesma lista de 66 livros (id canônico + nome completo) usada em
// src/lib/biblia/referencia.ts.
const LIVROS = [
  { id: "gn", nome: "Gênesis" },
  { id: "êx", nome: "Êxodo" },
  { id: "lv", nome: "Levítico" },
  { id: "nm", nome: "Números" },
  { id: "dt", nome: "Deuteronômio" },
  { id: "js", nome: "Josué" },
  { id: "jz", nome: "Juízes" },
  { id: "rt", nome: "Rute" },
  { id: "1sm", nome: "1 Samuel" },
  { id: "2sm", nome: "2 Samuel" },
  { id: "1rs", nome: "1 Reis" },
  { id: "2rs", nome: "2 Reis" },
  { id: "1cr", nome: "1 Crônicas" },
  { id: "2cr", nome: "2 Crônicas" },
  { id: "ed", nome: "Esdras" },
  { id: "ne", nome: "Neemias" },
  { id: "et", nome: "Ester" },
  { id: "jó", nome: "Jó" },
  { id: "sl", nome: "Salmos" },
  { id: "pv", nome: "Provérbios" },
  { id: "ec", nome: "Eclesiastes" },
  { id: "ct", nome: "Cânticos" },
  { id: "is", nome: "Isaías" },
  { id: "jr", nome: "Jeremias" },
  { id: "lm", nome: "Lamentações de Jeremias" },
  { id: "ez", nome: "Ezequiel" },
  { id: "dn", nome: "Daniel" },
  { id: "os", nome: "Oséias" },
  { id: "jl", nome: "Joel" },
  { id: "am", nome: "Amós" },
  { id: "ob", nome: "Obadias" },
  { id: "jn", nome: "Jonas" },
  { id: "mq", nome: "Miquéias" },
  { id: "na", nome: "Naum" },
  { id: "hc", nome: "Habacuque" },
  { id: "sf", nome: "Sofonias" },
  { id: "ag", nome: "Ageu" },
  { id: "zc", nome: "Zacarias" },
  { id: "ml", nome: "Malaquias" },
  { id: "mt", nome: "Mateus" },
  { id: "mc", nome: "Marcos" },
  { id: "lc", nome: "Lucas" },
  { id: "jo", nome: "João" },
  { id: "at", nome: "Atos" },
  { id: "rm", nome: "Romanos" },
  { id: "1co", nome: "1 Coríntios" },
  { id: "2co", nome: "2 Coríntios" },
  { id: "gl", nome: "Gálatas" },
  { id: "ef", nome: "Efésios" },
  { id: "fp", nome: "Filipenses" },
  { id: "cl", nome: "Colossenses" },
  { id: "1ts", nome: "1 Tessalonicenses" },
  { id: "2ts", nome: "2 Tessalonicenses" },
  { id: "1tm", nome: "1 Timóteo" },
  { id: "2tm", nome: "2 Timóteo" },
  { id: "tt", nome: "Tito" },
  { id: "fm", nome: "Filemom" },
  { id: "hb", nome: "Hebreus" },
  { id: "tg", nome: "Tiago" },
  { id: "1pe", nome: "1 Pedro" },
  { id: "2pe", nome: "2 Pedro" },
  { id: "1jo", nome: "1 João" },
  { id: "2jo", nome: "2 João" },
  { id: "3jo", nome: "3 João" },
  { id: "jd", nome: "Judas" },
  { id: "ap", nome: "Apocalipse" },
];

const SYSTEM_PROMPT = `Você é um assistente de pesquisa bíblica que está preparando material FIXO de um curso chamado "Manual de Contextualização Bíblica", baseado no método "Ajuste Interpretativo" (cujo primeiro movimento é: apropriar-se do contexto histórico e literário antes de interpretar).

Sua tarefa agora é escrever o bloco "Sobre este livro" de UM livro específico da Bíblia por vez. Esse bloco vai ser mostrado, sem mudar, a QUALQUER aluno que pesquisar QUALQUER versículo desse livro — por isso o conteúdo não pode ser específico de nenhum versículo, tem que valer pro livro inteiro.

O CRITÉRIO MAIS IMPORTANTE: isso não é uma curiosidade genérica nem uma ficha técnica decorativa. É a base de contexto que o leitor PRECISA ter pra conseguir interpretar corretamente qualquer parte deste livro. Pergunte-se, pra cada frase que for escrever: "isso muda como alguém deveria entender o que vai ler neste livro? Isso evita uma leitura equivocada?". Se a resposta for não, não inclua.

IMPORTANTE — TRATE OS DOIS PARÁGRAFOS COMO UM TEXTO SÓ, NÃO COMO DOIS TEXTOS SEPARADOS:
Antes de escrever, planeje mentalmente TUDO que vai dizer sobre o livro, decida em qual dos dois parágrafos cada informação vai entrar, e não repita nenhuma delas no outro parágrafo — nem com palavras diferentes. Cada fato (o assunto do livro, o motivo de ter sido escrito, quem escreveu, pra quem, quando, que situação viviam) aparece em EXATAMENTE um lugar. Depois de escrever os dois parágrafos, releia os dois juntos e pergunte: "alguma ideia aparece duas vezes, mesmo reformulada?" — se aparecer, corte a repetição.

Escreva exatamente dois campos:

CONTEXTO GERAL DO LIVRO — primeiro parágrafo (3 a 5 frases):
- SÓ isto: do que o livro trata (o assunto, a história ou o argumento central) e qual era a intenção/objetivo original dele (por que foi escrito, que problema ou necessidade ele resolve).
- NÃO mencione aqui quem escreveu, pra quem, nem quando — isso é só do segundo parágrafo.
- Termine com uma orientação prática do tipo "tenha isso em mente ao ler qualquer parte deste livro" — específica desse livro, não genérica.

CONTEXTO LITERÁRIO DO LIVRO — segundo parágrafo, reunindo em texto corrido:
1. O tipo literário do livro (ex.: carta, poema, narrativa histórica, profecia, apocalíptico) e uma dica prática de como esse tipo de texto costuma precisar ser lido, pra evitar erro de interpretação (ex.: não ler poesia como se fosse afirmação literal, não ler carta de resposta a um problema específico como se fosse regra universal, etc.).
2. Quem escreveu o livro — EXCETO se o livro tiver mais de um autor conhecido pra trechos diferentes (o exemplo clássico é o livro de Salmos). Nesse caso, não afirme um autor genérico — diga que a autoria varia por trecho.
3. Pra quem o livro foi escrito primariamente (que povo ou comunidade específica) e, em uma frase curta, que hoje também alcança a igreja atual — sem repetir o motivo/objetivo já explicado no primeiro parágrafo, só diga quem recebeu o livro.
4. A data aproximada em que foi escrito, se conhecida, citada de forma direta (ex.: "por volta de 55 d.C.").

SOBRE AUTORIA E DATAÇÃO (item 2 e 4 acima): apresente a autoria e a datação TRADICIONALMENTE aceitas pela igreja como resposta principal e direta (ex.: para Gênesis, autoria de Moisés, por volta do século XV a.C.). Só mencione teorias acadêmicas alternativas quando forem muito conhecidas (ex.: hipótese documentária para o Pentateuco) — e, mesmo assim, em no máximo uma frase curta, sem se aprofundar nem enfraquecer a resposta tradicional.

REGRAS DE LINGUAGEM (muito importante — vários textos anteriores ficaram complexos demais, corrija isso):
- Público leigo — pessoas sem formação teológica, bíblica ou acadêmica. Escreva como se estivesse explicando de viva voz pra alguém que nunca abriu um livro de teologia.
- Frases curtas. Evite frases com mais de uma oração subordinada — se uma frase ficou longa e cheia de vírgulas, quebre em duas.
- NUNCA use jargão acadêmico ou arcaico sem necessidade (ex.: "redacional", "sitz im leben", "cânone", "pseudonímia") — se o conceito for essencial, explique em uma frase simples; se não for essencial, corte.
- Evite frases de "ressalva acadêmica" longas (do tipo "embora alguns estudiosos argumentem que..., a posição tradicional sustenta que...") — se for mencionar uma teoria alternativa, faça em poucas palavras, sem transformar isso em um argumento à parte.
- Prefira frases afirmativas e diretas a frases cheias de qualificadores ("provavelmente", "de certa forma", "em certo sentido") — só use esses termos quando a incerteza real importa pro leitor entender o texto.

OUTRAS REGRAS:
- Você NÃO pode interpretar o significado espiritual do livro, nem aplicar à vida do leitor, nem emitir opinião ou conclusão doutrinária — só contexto histórico, literário e factual, que sirva de base pra a pessoa interpretar por conta própria depois.
- NÃO transcreva nenhum versículo do livro.
- Escreva os dois parágrafos como texto corrido e natural, não como lista de tópicos.
- Responda sempre em português.`;

const ContextoLivroSchema = z.object({
  contexto_geral_do_livro: z.string(),
  contexto_literario_do_livro: z.string(),
});

const PRECO_INPUT_POR_TOKEN_USD = 1 / 1_000_000;
const PRECO_OUTPUT_POR_TOKEN_USD = 5 / 1_000_000;

async function main() {
  await carregarEnv();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada (verifique o .env)");

  const filtro = process.argv[2];
  const livros = filtro ? LIVROS.filter((l) => l.nome === filtro) : LIVROS;
  if (filtro && livros.length === 0) {
    throw new Error(`Livro "${filtro}" não encontrado na lista LIVROS.`);
  }

  const client = new Anthropic({ apiKey });
  const dbClient = createClient({
    url: process.env.DATABASE_URL ?? "file:./data/app.db",
  });

  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS contexto_livro (
      livro TEXT PRIMARY KEY,
      contexto_geral TEXT NOT NULL,
      contexto_literario TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
    )
  `);

  let custoTotalUsd = 0;

  for (const livro of livros) {
    const response = await client.messages.parse({
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Livro: ${livro.nome}` }],
      output_config: { format: zodOutputFormat(ContextoLivroSchema) },
    });

    if (!response.parsed_output) {
      throw new Error(`Não foi possível interpretar a resposta da IA para ${livro.nome}`);
    }

    const { contexto_geral_do_livro, contexto_literario_do_livro } = response.parsed_output;
    const custo =
      response.usage.input_tokens * PRECO_INPUT_POR_TOKEN_USD +
      response.usage.output_tokens * PRECO_OUTPUT_POR_TOKEN_USD;
    custoTotalUsd += custo;

    await dbClient.execute({
      sql: `INSERT INTO contexto_livro (livro, contexto_geral, contexto_literario, updated_at)
            VALUES (?, ?, ?, cast(unixepoch('subsecond') * 1000 as integer))
            ON CONFLICT (livro) DO UPDATE SET
              contexto_geral = excluded.contexto_geral,
              contexto_literario = excluded.contexto_literario,
              updated_at = excluded.updated_at`,
      args: [livro.id, contexto_geral_do_livro, contexto_literario_do_livro],
    });

    console.log(`OK: ${livro.nome} (custo: $${custo.toFixed(5)})`);
  }

  console.log(`\nConcluído. ${livros.length} livro(s). Custo total: $${custoTotalUsd.toFixed(4)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
