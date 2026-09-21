import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z, type ZodType } from "zod";

// Abstrai qual provedor de IA está sendo usado, controlado pela variável
// de ambiente AI_PROVIDER ("anthropic" — padrão, modelo pago; qualquer
// outro valor cai na fila gratuita combinada — ver chamarGratuito).
// Isso existe pra permitir testar o aplicativo de graça antes de decidir
// se vale a pena continuar pagando a API da Anthropic — ver conversa
// sobre isso.

export type MensagemIa = { role: "user" | "assistant"; content: string };

export type ResultadoChamadaIa<T> = {
  dados: T;
  custoUsd: number;
};

// Preço do Claude Haiku 4.5 — em dólar por token.
const PRECO_INPUT_HAIKU_USD = 1 / 1_000_000;
const PRECO_OUTPUT_HAIKU_USD = 5 / 1_000_000;

async function chamarAnthropic<T>(
  systemPrompt: string,
  mensagens: MensagemIa[],
  schema: ZodType<T>,
): Promise<ResultadoChamadaIa<T>> {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: process.env["ANTHROPIC_MODEL"] || "claude-haiku-4-5",
      max_tokens: 8192,
      // O prompt de sistema é o mesmo em toda chamada — cacheá-lo evita
      // pagar preço cheio por ele a cada mensagem (só a primeira chamada
      // de cada janela de cache custa o valor integral).
      system: [
        { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
      ],
      messages: mensagens,
      output_config: { format: zodOutputFormat(schema) },
    });

    if (!response.parsed_output) {
      throw new Error("Não foi possível interpretar a resposta da IA");
    }

    const custoUsd =
      response.usage.input_tokens * PRECO_INPUT_HAIKU_USD +
      response.usage.output_tokens * PRECO_OUTPUT_HAIKU_USD;

    return { dados: response.parsed_output, custoUsd };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new Error("Chave da API da Anthropic inválida");
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new Error("Limite de uso da API atingido, tente novamente em instantes");
    }
    if (error instanceof Anthropic.APIError) {
      throw new Error(`Falha na análise (status ${error.status})`);
    }
    throw error;
  }
}

// Fila gratuita: combina provedores diferentes, cada um com sua própria
// chave — não só a OpenRouter. A OpenRouter é uma AGREGADORA (ela mesma
// busca em vários provedores por trás), e o free tier dela é uma fila
// compartilhada GLOBALMENTE com todo mundo que usa a mesma camada
// gratuita — foi isso que causou a lentidão/apinhamento visto em produção
// (429 "rate-limited upstream"). Gemini é chamado DIRETO, com chave
// própria — não compete pela fila de terceiros.
//
// Ordem de prioridade:
// 1. Gemini (Google AI Studio) — cota diária própria e generosa (não é
//    fila compartilhada), suporta formato JSON estruturado, e foi
//    validado em produção respondendo corretamente em todos os testes.
// 2. OpenRouter — mantida como fonte extra de variedade, já que é a mais
//    sujeita a apinhamento.
//
// GROQ FICOU DE FORA DA FILA (deliberadamente, testado e descartado):
// tem hardware rápido e os modelos gpt-oss até geram conteúdo de boa
// qualidade, mas nos testes reais (openai/gpt-oss-120b e -20b, com e sem
// modo "strict") ele erra a POSIÇÃO de campos no nosso schema aninhado —
// ex.: manda "referencia" solto dentro de "resultado" em vez de dentro de
// "resultado.dados.referencia" — e com "strict" ligado chega a falhar em
// GERAR uma resposta válida. Ou seja, não é falta de sorte da fila, é
// incompatibilidade real com a complexidade do nosso schema hoje. A
// chave continua configurável (GROQ_API_KEY) caso valha testar de novo no
// futuro — com um schema mais simples ou um modelo novo do Groq — mas não
// entra na fila até isso ser reavaliado.
type ProvedorGratuito = {
  nome: string;
  baseUrl: string;
  apiKey: string;
  modelos: string[];
  // A OpenRouter pede esses cabeçalhos extras (não é exigido pelos outros).
  headersExtras?: Record<string, string>;
  strict?: boolean;
};

function montarFilaGratuita(): { provedor: ProvedorGratuito; modelo: string }[] {
  const provedores: ProvedorGratuito[] = [];

  const geminiKey = process.env["GEMINI_API_KEY"];
  if (geminiKey) {
    provedores.push({
      nome: "gemini",
      // Google expõe um endpoint compatível com o formato da OpenAI —
      // permite reusar exatamente o mesmo formato de pedido/resposta.
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      apiKey: geminiKey,
      modelos: ["gemini-flash-lite-latest", "gemini-flash-latest"],
    });
  }

  const openrouterKey = process.env["OPENROUTER_API_KEY"];
  if (openrouterKey) {
    // Se um modelo específico foi forçado via env, usa só ele.
    const modeloForcado = process.env["OPENROUTER_MODEL"];
    provedores.push({
      nome: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: openrouterKey,
      headersExtras: {
        "HTTP-Referer": "https://manual-contextualizacao-biblica.local",
        "X-Title": "Manual de Contextualizacao Biblica (teste)",
      },
      modelos: modeloForcado
        ? [modeloForcado]
        : [
            // IMPORTANTE: essa ordem parte de um teste único (velocidade +
            // compatibilidade de formato) — é uma "foto" daquele momento,
            // não um benchmark permanente, já que essa camada é
            // compartilhada globalmente e a disponibilidade varia.
            //
            // Removidos (não é questão de fila, é incompatibilidade real):
            // thinkingmachines/inkling(-small) (403, só p/ agentic
            // harnesses), inclusionai/ling-3.0-* (400), e modelos de
            // "raciocínio" (pareciam rápidos em teste simples, mas
            // levaram ~60s e erraram o formato no pedido real).
            "nvidia/nemotron-3-super-120b-a12b:free",
            "google/gemma-4-31b-it:free",
            "google/gemma-4-26b-a4b-it:free",
            "nex-agi/nex-n2.5-mini:free",
            "dots-studio/dots-3-note-preview:free",
            "liquid/lfm-2.5-2.6b:free",
            "nex-agi/nex-n2.5-pro:free",
            "poolside/laguna-s-2.1:free",
            "poolside/laguna-xs-2.1:free",
            "nvidia/nemotron-3.5-lightning:free",
            "nvidia/nemotron-3-ultra-550b-a55b:free",
          ],
    });
  }

  const fila: { provedor: ProvedorGratuito; modelo: string }[] = [];
  for (const provedor of provedores) {
    for (const modelo of provedor.modelos) fila.push({ provedor, modelo });
  }
  return fila;
}

// Em vez de um número fixo de tentativas, usamos um ORÇAMENTO TOTAL de
// tempo — assim a fila pode percorrer TODOS os modelos gratuitos
// disponíveis (a maioria das falhas, como 429 de limite atingido, volta
// quase instantânea — ver log real de produção), mas sem nunca estourar
// o tempo. O orçamento PRECISA ficar bem abaixo de ~120s — esse é o
// timeout padrão de servidor HTTP do Node, e passar disso faz a conexão
// cair no meio, e o navegador mostra "Failed to fetch" pro aluno em vez
// da nossa mensagem amigável (a conexão morre antes do servidor
// conseguir responder qualquer coisa). Foi isso que aconteceu quando o
// total de tentativas somava até 200s.
const ORCAMENTO_TOTAL_MS = 90_000;
const TIMEOUT_POR_TENTATIVA_MS = 25_000;

async function tentarModeloGratuito<T>(
  provedor: ProvedorGratuito,
  modelo: string,
  systemPrompt: string,
  mensagens: MensagemIa[],
  jsonSchema: unknown,
  schema: ZodType<T>,
  timeoutMs: number,
): Promise<{ ok: true; dados: T } | { ok: false; motivo: string; tentarProximo: boolean }> {
  const controle = new AbortController();
  const timeout = setTimeout(() => controle.abort(), timeoutMs);

  // O timeout precisa cobrir a operação INTEIRA — não só o fetch() em si,
  // mas também a leitura do corpo da resposta (response.text()/json()).
  // Se só limpássemos o timeout logo depois do fetch() resolver (quando os
  // cabeçalhos chegam), uma resposta que trava no meio do corpo (conexão
  // lenta, stream que nunca fecha) ficaria esperando pra sempre, sem
  // nenhum limite — foi exatamente isso que travou uma consulta por mais
  // de 2 minutos.
  try {
    const response = await fetch(provedor.baseUrl, {
      method: "POST",
      signal: controle.signal,
      headers: {
        Authorization: `Bearer ${provedor.apiKey}`,
        "Content-Type": "application/json",
        ...provedor.headersExtras,
      },
      body: JSON.stringify({
        model: modelo,
        messages: [{ role: "system", content: systemPrompt }, ...mensagens],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "resposta",
            strict: provedor.strict ?? true,
            schema: jsonSchema,
          },
        },
      }),
    });

    if (response.status === 401 || response.status === 403) {
      // Chave inválida — tentar outro modelo DESSE MESMO provedor não vai
      // ajudar, mas os outros provedores da fila continuam valendo.
      return { ok: false, motivo: `chave de ${provedor.nome} inválida`, tentarProximo: true };
    }
    if (!response.ok) {
      // 429 (limite/ocupado), 5xx, etc. — modelo indisponível agora, tenta o próximo.
      const texto = await response.text().catch(() => "");
      return {
        ok: false,
        motivo: `status ${response.status}: ${texto.slice(0, 200)}`,
        tentarProximo: true,
      };
    }

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const conteudo = json.choices?.[0]?.message?.content;
    if (!conteudo) {
      return { ok: false, motivo: "resposta sem conteúdo", tentarProximo: true };
    }

    let envelope: unknown;
    try {
      envelope = JSON.parse(conteudo);
    } catch {
      return { ok: false, motivo: "resposta não veio em JSON válido", tentarProximo: true };
    }

    // O schema pedido ao modelo é sempre embrulhado em { resultado: ... }
    // (ver chamarGratuito) — aqui desembrulha antes de validar.
    const bruto = (envelope as { resultado?: unknown } | null)?.resultado;

    const validado = schema.safeParse(bruto);
    if (!validado.success) {
      return {
        ok: false,
        motivo: `formato inesperado: ${validado.error.issues[0]?.message ?? "erro de validação"}`,
        tentarProximo: true,
      };
    }

    return { ok: true, dados: validado.data };
  } catch (error) {
    const motivo =
      error instanceof Error && error.name === "AbortError"
        ? "tempo esgotado"
        : "falha de conexão";
    return { ok: false, motivo, tentarProximo: true };
  } finally {
    clearTimeout(timeout);
  }
}

async function chamarGratuito<T>(
  systemPrompt: string,
  mensagens: MensagemIa[],
  schema: ZodType<T>,
  atendeQualidadeMinima?: (dados: T) => boolean,
  mesclarComReserva?: (base: T, reserva: T) => T,
): Promise<ResultadoChamadaIa<T>> {
  const fila = montarFilaGratuita();
  if (fila.length === 0) {
    throw new Error(
      "Nenhuma chave de IA gratuita configurada (GROQ_API_KEY, GEMINI_API_KEY ou OPENROUTER_API_KEY)",
    );
  }

  // A Groq (em modo strict) exige que o schema RAIZ seja um objeto simples,
  // sem "anyOf"/"oneOf" no nível de cima — e é exatamente isso que o Zod
  // gera pra um discriminatedUnion (nosso RespostaChatIaSchema). Por isso
  // embrulhamos o schema real dentro de um objeto com uma única
  // propriedade "resultado" — satisfaz a raiz exigida, e o union continua
  // valendo um nível abaixo. Desembrulhado de volta em tentarModeloGratuito.
  const jsonSchema = {
    type: "object",
    properties: { resultado: z.toJSONSchema(schema, { target: "draft-7" }) },
    required: ["resultado"],
    additionalProperties: false,
  };
  const falhas: string[] = [];
  const inicio = Date.now();
  // Guarda a primeira resposta válida (passou no schema), mesmo que fique
  // abaixo do mínimo de qualidade desejado — serve de rede de segurança:
  // se NENHUM provedor da fila atingir o mínimo dentro do orçamento de
  // tempo, é melhor entregar essa resposta mais fraca do que a mensagem
  // de "canais cheios" (que é só pra quando ninguém respondeu nada).
  let reserva: T | null = null;

  for (const { provedor, modelo } of fila) {
    const restante = ORCAMENTO_TOTAL_MS - (Date.now() - inicio);
    // Sem tempo sobrando no orçamento — para de tentar mais modelos e cai
    // direto na mensagem amigável, em vez de arriscar estourar o timeout
    // do servidor.
    if (restante <= 0) {
      falhas.push(`${provedor.nome}/${modelo}: pulado (orçamento de tempo esgotado)`);
      break;
    }

    const inicioTentativa = Date.now();
    const resultado = await tentarModeloGratuito(
      provedor,
      modelo,
      systemPrompt,
      mensagens,
      jsonSchema,
      schema,
      Math.min(TIMEOUT_POR_TENTATIVA_MS, restante),
    );
    const duracaoMs = Date.now() - inicioTentativa;

    if (resultado.ok) {
      // Se já existe uma reserva de uma tentativa anterior insuficiente,
      // mescla com ela ANTES de checar qualidade — a soma do que essa
      // tentativa achou com o que a anterior já tinha achado pode bater o
      // mínimo, mesmo que nenhuma das duas sozinha batesse. É assim que
      // os provedores "trabalham juntos" de verdade, e não só um
      // substituindo o outro.
      const dados: T =
        reserva && mesclarComReserva ? mesclarComReserva(resultado.dados, reserva) : resultado.dados;
      const qualidadeOk = atendeQualidadeMinima?.(dados) ?? true;
      if (qualidadeOk) {
        const mesclado = dados !== resultado.dados;
        console.log(
          `[ia-gratis] respondeu: ${provedor.nome}/${modelo} em ${duracaoMs}ms${mesclado ? " (mesclado com reserva anterior)" : ""}`,
        );
        // Camada gratuita — custo real é zero.
        return { dados, custoUsd: 0 };
      }

      // Ainda abaixo do mínimo mesmo após tentar mesclar — guarda essa
      // versão (já com o que foi mesclado até aqui) como a nova reserva, e
      // deixa a fila tentar o PRÓXIMO PROVEDOR.
      console.log(
        `[ia-gratis] respondeu mas abaixo do mínimo (${provedor.nome}/${modelo}) em ${duracaoMs}ms — tentando outro provedor`,
      );
      reserva = dados;
      continue;
    }

    console.log(
      `[ia-gratis] falhou (${provedor.nome}/${modelo}) em ${duracaoMs}ms: ${resultado.motivo}`,
    );
    falhas.push(`${provedor.nome}/${modelo}: ${resultado.motivo}`);
  }

  if (reserva) {
    console.log("[ia-gratis] nenhum provedor atingiu o mínimo — usando a melhor reserva");
    return { dados: reserva, custoUsd: 0 };
  }

  // Log técnico detalhado só pro servidor — o que o usuário vê é uma
  // mensagem tranquila, sem jargão, já que isso acontece só num cenário
  // bem específico: todos os modelos gratuitos da fila (de todos os
  // provedores) ocupados ao mesmo tempo.
  console.log(`[ia-gratis] todas as tentativas falharam: ${falhas.join(" | ")}`);

  throw new Error(
    "Nossos canais de resposta estão cheios nesse momento. Isso pode acontecer de vez em quando — tenta de novo daqui a pouco, geralmente libera rápido.",
  );
}

export async function chamarIa<T>(
  systemPrompt: string,
  mensagens: MensagemIa[],
  schema: ZodType<T>,
  // Critério opcional de qualidade mínima — só vale pra fila gratuita
  // (ver chamarGratuito): se a resposta de um provedor não atender, a
  // fila continua tentando os outros antes de aceitar. Ignorado no modo
  // Anthropic — lá o modelo pago já entrega qualidade consistente, e
  // ficar tentando de novo só multiplicaria custo real à toa.
  atendeQualidadeMinima?: (dados: T) => boolean,
  // Função opcional pra combinar uma resposta insuficiente com a reserva
  // de uma tentativa anterior (ver chamarGratuito) — permite que dois
  // provedores diferentes "somem" o que cada um achou em vez de um
  // simplesmente substituir o outro. Também ignorado no modo Anthropic.
  mesclarComReserva?: (base: T, reserva: T) => T,
  // Quando true, usa a fila gratuita mesmo com AI_PROVIDER=anthropic —
  // é assim que o chat.functions.ts implementa o "estourou o crédito do
  // aluno, cai pro modo gratuito em vez de bloquear" (ver enviarMensagem).
  forcarGratuito?: boolean,
): Promise<ResultadoChamadaIa<T>> {
  const provedor = process.env["AI_PROVIDER"] || "anthropic";
  if (provedor === "anthropic" && !forcarGratuito) {
    return chamarAnthropic(systemPrompt, mensagens, schema);
  }
  return chamarGratuito(systemPrompt, mensagens, schema, atendeQualidadeMinima, mesclarComReserva);
}
