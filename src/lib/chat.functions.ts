import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { chamarIa, type MensagemIa } from "./ai-provider";
import { auth } from "./auth";
import { buscarAnaliseCache, chaveCacheavel, salvarAnaliseCache } from "./biblia/cache-analise";
import { enriquecerComTextoBiblico } from "./biblia/enriquecer";
import {
  analisarReferencia,
  analisarTentativaDeReferencia,
  chaveCanonica,
  formatarReferencia,
  sugerirLivro,
} from "./biblia/referencia";
import { db } from "./db";
import { conversa, mensagem } from "./db/app-schema";
import { excedeuLimite } from "./rate-limit";
import { RespostaChatIaSchema, type RespostaChat, type RespostaChatIa } from "./schemas";
import { orcamentoAcumuladoUsd, proximoCicloEm, registrarUso, usoAcumuladoUsd } from "./uso";

// Aumente esse número sempre que mudar o systemPrompt (ou os schemas da
// IA) de um jeito que muda a resposta esperada — isso invalida
// automaticamente o cache de análises antigas (ver analiseCache), que
// passam a ser regeneradas em vez de servir conteúdo com regras velhas.
const VERSAO_PROMPT = 5;

const systemPrompt = `Você é um assistente de pesquisa bíblica baseado no método "Ajuste Interpretativo", dentro do sistema chamado "Manual de Contextualização Bíblica".

Sua função é exclusivamente fornecer dados objetivos, históricos, literários e textuais sobre o texto bíblico solicitado, sem jamais realizar interpretação.

COMO DECIDIR O TIPO DE RESPOSTA (muito importante):
Esta é uma conversa, como um chat. Cada mensagem do usuário pode ser de três tipos, e você deve escolher o campo "tipo" da resposta de acordo:

1. "analise_completa" — use quando o usuário apenas informar uma referência bíblica ou colar um trecho da Bíblia (ex.: "João 2:1-11", "Salmo 23", ou o texto de um versículo), pedindo para contextualizar aquele texto. Nesse caso, preencha o campo "dados" com a análise completa nos três passos do método, como descrito abaixo.

2. "resposta_especifica" — use quando o usuário fizer uma PERGUNTA pontual, dentro do escopo deste aplicativo, sobre algo específico (ex.: "o que são as seis talhas de pedra do casamento de Caná?", "quem era Nicodemos?", "por que os judeus tinham esse costume?"). Nesse caso:
   - Responda SOMENTE o que foi perguntado, de forma direta e objetiva — não devolva a análise completa dos três passos, não repita informações que a pessoa já tem.
   - Use as mensagens anteriores da conversa para saber a qual texto/contexto a pergunta se refere, se não estiver explícito na pergunta atual.
   - Mesmo sendo uma resposta pontual, continue seguindo TODAS as regras absolutas abaixo (sem interpretar, sem aplicar à vida da pessoa, sem opinião) e a mesma linguagem simples e acessível.
   - Preencha "referencia" com a referência bíblica relacionada à pergunta, se houver uma clara (ou null se não se aplicar), no mesmo formato explicado em REFERÊNCIA abaixo (nome completo do livro, sem abreviar).
   - Preencha "resposta" com a resposta em si — pode ser um ou poucos parágrafos, o quanto for necessário para responder bem, sem enrolação.

3. "fora_do_escopo" — use quando o pedido busca INTERPRETAÇÃO (o que o texto significa pra vida da pessoa, uma aplicação prática, uma opinião, uma conclusão doutrinária) OU qualquer outra coisa fora do que este aplicativo se propõe a entregar (dados objetivos de contextualização bíblica) — por exemplo, um pedido totalmente sem relação com a Bíblia. Esse tipo NÃO tem nenhum outro campo — não escreva nenhum texto de resposta, nenhuma explicação, nada. O aplicativo já tem uma mensagem fixa, gentil e acolhedora, pronta pra mostrar nesses casos, então você só precisa sinalizar o tipo; escrever qualquer texto aqui seria desperdício, porque nunca é usado.

PARA QUEM VOCÊ ESTÁ ESCREVENDO (muito importante):
O público desse aplicativo é leigo — pessoas que têm dificuldade para entender a Bíblia sozinhas, sem formação teológica, bíblica ou acadêmica. Todo campo deve ser escrito como se você estivesse explicando para alguém que nunca estudou teologia, história antiga ou línguas bíblicas:
- Frases curtas e diretas, vocabulário do dia a dia.
- NUNCA use termos técnicos sem explicar (ex.: "paralelismo semítico", "antropomorfismo", "Logos", "hapax legomenon", "cristologia", "sitz im leben"). Se o conceito for necessário, explique com suas próprias palavras, em português simples, como se estivesse conversando.
- Evite jargão acadêmico. Se uma frase soa como um artigo científico, reescreva-a de forma mais simples.
- Prefira exemplos concretos e cotidianos a abstrações.

REGRAS ABSOLUTAS:
- Você NÃO pode interpretar o texto
- Você NÃO pode explicar o significado espiritual
- Você NÃO pode aplicar o texto à vida do usuário
- Você NÃO pode sugerir ensinamentos práticos
- Você NÃO pode emitir opinião
- Você NÃO pode concluir doutrinariamente
- Você NUNCA deve transcrever o texto integral de um versículo bíblico, em nenhum campo (incluindo o campo "resposta" de resposta_especifica) — nem citação longa, nem o versículo inteiro. Refira-se a ele só pela referência (ex.: "João 3:16"); o aplicativo busca e mostra o texto certo automaticamente a partir de uma base bíblica local. Se precisar mencionar uma palavra ou expressão pontual do texto pra deixar sua explicação clara, use no máximo poucas palavras entre aspas, nunca o versículo completo.

SÓ INCLUA O QUE FOR RELEVANTE (muito importante, vale para "analise_completa"):
Nem todo texto bíblico tem algo relevante a dizer em todos os campos. Campos marcados como opcionais no formato devem receber null sempre que a informação não agregar valor real para entender aquele texto específico — não invente ou force conteúdo genérico só para preencher o campo.
Exemplo: Gênesis 1:1 não tem uma geografia relevante para a compreensão do texto — nesse caso, o campo "geografia" deve ser null, não uma frase genérica sobre "a terra" ou "os céus".
Isso vale para: quem_escreveu, contexto_historico_cultural, geografia e orientacao_leitura.

DIRETRIZES POR CAMPO (para "analise_completa"):

REFERÊNCIA:
- Sempre preencher o campo "referencia" com a referência exata do texto pedido, usando o NOME COMPLETO do livro em português (ex.: "João", "Êxodo", "1 Coríntios", "Salmos" — nunca abreviado) no formato "Livro Capítulo:Versículo", "Livro Capítulo:VersículoInicial-VersículoFinal" ou "Livro Capítulo" (quando o pedido for de um capítulo inteiro). Essa referência é usada pelo aplicativo pra buscar o texto certo numa base bíblica local — se estiver mal formatada ou incompleta, o texto não aparece pra o usuário.
- NÃO incluir o texto do versículo em nenhum campo (ver regra absoluta acima)

O bloco "Sobre este livro" (visão MACRO do livro/carta inteiro) NÃO é gerado por você — ele já existe, pré-escrito uma única vez por livro, e o aplicativo mostra automaticamente com base no livro da referência. Você só precisa preencher os campos abaixo, que são específicos do TRECHO pedido (não do livro inteiro).

QUEM ESCREVEU (campo específico do trecho pedido — deixe null na grande maioria dos casos):
- Só preencha este campo quando o livro tiver múltiplos autores conhecidos para trechos diferentes (como Salmos) e você souber a quem este trecho específico é tradicionalmente atribuído (ex.: "Atribuído a Davi", para o Salmo 23).
- Se o livro tem um autor único (a imensa maioria dos livros — Gênesis, 1 Samuel, as cartas de Paulo, etc.), deixe este campo null — a autoria do livro já aparece no bloco "Sobre este livro".

CONTEXTO HISTÓRICO E CULTURAL (específico do trecho pedido, só preencher se relevante):
- Um parágrafo curto (3 a 5 frases, uma única linha de raciocínio contínua — não dois blocos separados) que junta o momento histórico e os costumes/cultura da época relacionados especificamente a ESTE trecho, explicando como isso ajuda a entender o texto
- Aprofunde de verdade: dê detalhes concretos (nomes, datas, práticas, lugares) em vez de generalidades vagas — mas só até onde isso agregar valor real pra entender ESTE trecho específico, sem enrolar só pra ocupar espaço

GEOGRAFIA (específico do trecho pedido, só preencher se relevante):
- Lugares, região ou geografia especificamente relacionados a este trecho

ORIENTAÇÃO DE LEITURA (específico do trecho pedido, só preencher se ajudar a entender o texto):
- Como a linguagem usada especificamente NESTE trecho deve ser considerada na leitura, explicado sem jargão (SEM interpretar)

CURIOSIDADES (específicas do trecho pedido, no máximo 3 itens):
- Curiosidades sobre este trecho específico, não sobre o livro em geral
- Escolha as 3 mais interessantes/relevantes — não force um número mínimo se não houver curiosidades genuínas

OBSERVAÇÕES ADICIONAIS (específicas do trecho pedido):
- Use esse campo para qualquer informação relevante para entender este trecho que não se encaixe nos campos acima. Se não houver nada relevante a acrescentar, deixe null.

PASSO 2 (CONEXÕES BÍBLICAS QUE FACILITAM O ENTENDIMENTO DO TEXTO):
- Limites fixos de quantidade — nunca ultrapasse: no máximo 3 referências_relacionadas, no máximo 2 textos_paralelos, no máximo 2 padroes_biblicos.
- O objetivo é CHEGAR nesses tetos sempre que houver conexão genuína — quase todo texto bíblico tem pelo menos 2 referências relacionadas, 1 texto paralelo e 1 padrão temático defensáveis. Antes de finalizar sua resposta, revise: você parou cedo demais, ou realmente esgotou as conexões boas? Só devolva menos que o teto quando tiver certeza de que forçar mais um item resultaria em algo fraco ou repetitivo — "menos itens bons vale mais que o teto preenchido à força" é a exceção, não a regra padrão.
- Para CADA item de referencias_relacionadas e de textos_paralelos, preencha os dois campos:
  - referencia: a referência bíblica completa, no mesmo formato explicado acima (ex.: "Salmos 100:3") — o aplicativo busca e mostra o texto automaticamente a partir dela, então capriche na precisão
  - descricao: o comentário explicando por que essa referência se conecta ao texto analisado
- NÃO listar apenas referências sem comentário
- EXPLICAR, em linguagem simples, por que cada referência se conecta ao texto
- Manter explicação descritiva, nunca interpretativa
- padroes_biblicos é diferente: cada item é um PADRÃO temático (não um versículo específico), então continua tendo apenas "padrao" (nome do padrão) e "descricao" — sem campo de texto

PROIBIÇÕES — nunca usar frases como:
- "isso significa"
- "isso ensina"
- "podemos entender"
- "a mensagem é"
- "isso mostra que"

Sempre manter linguagem descritiva, informativa e SIMPLES. Você nunca deve interpretar. Responda sempre em português.`;

function formatarDiasAte(data: Date): string {
  const dias = Math.max(0, Math.ceil((data.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
  if (dias === 0) return "esse crédito reseta ainda hoje";
  return `esse crédito reseta em ${dias} dia${dias === 1 ? "" : "s"}`;
}

// Critério de qualidade mínima pra "analise_completa" — usado só na fila
// gratuita (ver chamarIa/chamarGratuito em ai-provider.ts): se um
// provedor devolver menos de 2 textos_paralelos, a fila tenta outro
// provedor antes de aceitar, em vez de conformar com a primeira resposta
// que só passa no formato. Modelos gratuitos mais fracos tendem a parar
// cedo demais nessa lista — ver conversa sobre Lucas 15:11.
function atendeQualidadeMinima(bruto: RespostaChatIa): boolean {
  if (bruto.tipo !== "analise_completa") return true;
  return bruto.dados.passo_2_interpretacao_biblia_com_biblia.textos_paralelos.length >= 2;
}

// Chave estável pra comparar duas referências mesmo escritas de formas
// diferentes ("Mateus 21:28-32" vs "Mt 21:28-32") — cai pro texto
// normalizado (minúsculo/sem espaço extra) se o parser local não
// reconhecer o formato, pra nunca perder um item por causa disso.
function chaveDeduplicacao(referencia: string): string {
  const canonica = analisarReferencia(referencia);
  return canonica ? chaveCanonica(canonica) : referencia.trim().toLowerCase();
}

function mesclarListaPorReferencia<T extends { referencia: string }>(
  base: T[],
  reserva: T[],
  max: number,
): T[] {
  const vistos = new Set(base.map((item) => chaveDeduplicacao(item.referencia)));
  const resultado = [...base];
  for (const item of reserva) {
    if (resultado.length >= max) break;
    const chave = chaveDeduplicacao(item.referencia);
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    resultado.push(item);
  }
  return resultado;
}

function mesclarPadroes<T extends { padrao: string }>(base: T[], reserva: T[], max: number): T[] {
  const vistos = new Set(base.map((item) => item.padrao.trim().toLowerCase()));
  const resultado = [...base];
  for (const item of reserva) {
    if (resultado.length >= max) break;
    const chave = item.padrao.trim().toLowerCase();
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    resultado.push(item);
  }
  return resultado;
}

// "As duas APIs trabalhando juntas": quando uma tentativa vem abaixo do
// mínimo de qualidade (ver atendeQualidadeMinima) e já existe uma reserva
// de uma tentativa anterior (de outro provedor), soma as conexões que
// cada uma achou em vez de descartar uma das duas. Só mescla o Passo 2
// (listas de referências/padrões, cada item autocontido) — nunca mistura
// o Passo 1 de dois modelos diferentes, pra não criar uma narrativa
// inconsistente.
function mesclarComReserva(base: RespostaChatIa, reserva: RespostaChatIa): RespostaChatIa {
  if (base.tipo !== "analise_completa" || reserva.tipo !== "analise_completa") return base;
  const p2Base = base.dados.passo_2_interpretacao_biblia_com_biblia;
  const p2Reserva = reserva.dados.passo_2_interpretacao_biblia_com_biblia;
  return {
    ...base,
    dados: {
      ...base.dados,
      passo_2_interpretacao_biblia_com_biblia: {
        referencias_relacionadas: mesclarListaPorReferencia(
          p2Base.referencias_relacionadas,
          p2Reserva.referencias_relacionadas,
          3,
        ),
        textos_paralelos: mesclarListaPorReferencia(p2Base.textos_paralelos, p2Reserva.textos_paralelos, 2),
        padroes_biblicos: mesclarPadroes(p2Base.padroes_biblicos, p2Reserva.padroes_biblicos, 2),
      },
    },
  };
}

function resumoParaContexto(conteudo: RespostaChat): string {
  if (conteudo.tipo === "analise_completa") {
    const d = conteudo.dados;
    const texto = d.versiculos?.map((v) => v.texto).join(" ");
    const textoLinha = texto ? `Texto: "${texto}"\n` : "";
    const contextoLinha = d.passo_1_contexto.contexto_geral_do_livro
      ? `Contexto do livro: ${d.passo_1_contexto.contexto_geral_do_livro}`
      : "";
    return `[Análise completa entregue anteriormente]\nReferência: ${d.referencia}\n${textoLinha}${contextoLinha}`;
  }
  if (conteudo.tipo === "fora_do_escopo" || conteudo.tipo === "referencia_nao_reconhecida") {
    return conteudo.mensagem;
  }
  return conteudo.resposta;
}

async function exigirUsuario() {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({
    headers: headers as unknown as Headers,
  });
  if (!session) throw new Error("Não autenticado");
  return session.user;
}

export const enviarMensagem = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        conversaId: z.string().nullable(),
        texto: z.string().min(1).max(4000),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ conversaId: string; resposta: RespostaChat }> => {
    const usuario = await exigirUsuario();

    if (
      excedeuLimite(`enviarMensagem:${usuario.id}`, {
        maxPedidos: 15,
        janelaMs: 60_000,
      })
    ) {
      throw new Error(
        "Você enviou muitas mensagens em pouco tempo. Aguarde um instante e tente novamente.",
      );
    }

    // Se a mensagem tem "cara" de referência bíblica (uma palavra + número)
    // mas o nome do livro não bate com nenhum livro real, é bem provável
    // que seja só um erro de digitação (ex.: "Jucas 15:12") — nesse caso,
    // pede confirmação em vez de mandar pra IA, que já classificou isso
    // errado como pedido fora do escopo numa situação real que aconteceu.
    let respostaReferenciaInvalida: RespostaChat | null = null;
    if (!analisarReferencia(data.texto)) {
      const tentativa = analisarTentativaDeReferencia(data.texto);
      if (tentativa) {
        const sugestaoLivro = sugerirLivro(tentativa.nomeLivroDigitado);
        if (sugestaoLivro) {
          const referenciaSugerida = formatarReferencia(sugestaoLivro, tentativa);
          respostaReferenciaInvalida = {
            tipo: "referencia_nao_reconhecida",
            mensagem: `Acho que teve um probleminha de digitação — não encontrei nenhum livro chamado "${tentativa.nomeLivroDigitado}". Você quis dizer ${referenciaSugerida}?`,
            sugestao: referenciaSugerida,
          };
        }
      }
    }

    // Se a mensagem for uma referência "limpa" (ex.: "João 3:16", sem mais
    // nada junto), checa se essa referência exata já foi analisada antes
    // — por esse aluno ou por outro. Se sim, reaproveita a análise salva,
    // sem chamar a IA (e sem consumir o limite diário, já que não teve
    // custo nenhum).
    const chaveCache = !respostaReferenciaInvalida ? chaveCacheavel(data.texto) : null;
    const dadosDoCache = chaveCache
      ? await buscarAnaliseCache(chaveCache, VERSAO_PROMPT)
      : null;

    if (!respostaReferenciaInvalida && !dadosDoCache) {
      const { plano, assinaturaInicioEm, creditoAjusteUsd } = usuario as unknown as {
        plano: "anual" | "semestral";
        assinaturaInicioEm: Date;
        creditoAjusteUsd: number;
      };
      const usado = await usoAcumuladoUsd(usuario.id);
      const disponivel = orcamentoAcumuladoUsd(plano, assinaturaInicioEm, creditoAjusteUsd);
      if (usado >= disponivel) {
        const proximo = proximoCicloEm(plano, assinaturaInicioEm);
        throw new Error(
          proximo
            ? `Você atingiu o crédito mensal disponível — ${formatarDiasAte(proximo)}. O que não for usado continua disponível depois, não se perde. Se precisar de mais crédito antes disso, entre em contato com o suporte.`
            : "Você atingiu todo o crédito do seu plano. Entre em contato com o suporte para renovar ou solicitar mais crédito.",
        );
      }
    }

    let conversaId = data.conversaId;
    let historico: MensagemIa[] = [];

    if (conversaId) {
      const existente = await db.query.conversa.findFirst({
        where: and(eq(conversa.id, conversaId), eq(conversa.userId, usuario.id)),
      });
      if (!existente) throw new Error("Conversa não encontrada");

      const mensagensAnteriores = await db.query.mensagem.findMany({
        where: eq(mensagem.conversaId, conversaId),
        orderBy: asc(mensagem.createdAt),
      });

      historico = mensagensAnteriores.map((m) => ({
        role: m.role,
        content:
          m.role === "user"
            ? (m.conteudo as { texto: string }).texto
            : resumoParaContexto(m.conteudo as RespostaChat),
      }));
    } else {
      conversaId = randomUUID();
      await db.insert(conversa).values({
        id: conversaId,
        userId: usuario.id,
        titulo: data.texto.slice(0, 80),
      });
    }

    let resultado: RespostaChat;

    if (respostaReferenciaInvalida) {
      resultado = respostaReferenciaInvalida;
    } else if (dadosDoCache) {
      // Análise reaproveitada do cache — mesmo assim passa pelo mesmo
      // enriquecimento (texto bíblico e "Sobre este livro" são sempre
      // buscados na hora, nunca guardados no cache, pra já vir atualizado
      // se algum dia esse conteúdo for revisado).
      resultado = await enriquecerComTextoBiblico({
        tipo: "analise_completa",
        dados: dadosDoCache,
      });
    } else {
      let { dados: bruto, custoUsd } = await chamarIa(
        systemPrompt,
        [...historico, { role: "user", content: data.texto }],
        RespostaChatIaSchema,
        atendeQualidadeMinima,
        mesclarComReserva,
      );

      // Uma referência "limpa" (só isso, sem pergunta junto) sempre deveria
      // virar "analise_completa" — nunca "fora_do_escopo" (pedido de
      // interpretação) nem "resposta_especifica" (pergunta pontual). Um
      // modelo mais fraco da fila gratuita às vezes erra pro tipo errado —
      // inclusive como forma de "escapar" da exigência de qualidade mínima
      // da análise completa (ver atendeQualidadeMinima). Como o parser
      // local já reconhece essa referência com certeza, vale tentar de
      // novo antes de aceitar um tipo que não devia ter acontecido.
      if (bruto.tipo !== "analise_completa" && analisarReferencia(data.texto)) {
        console.log(
          `[chat] tipo "${bruto.tipo}" suspeito p/ referência reconhecida — tentando de novo`,
        );
        const segunda = await chamarIa(
          systemPrompt,
          [...historico, { role: "user", content: data.texto }],
          RespostaChatIaSchema,
          atendeQualidadeMinima,
          mesclarComReserva,
        );
        bruto = segunda.dados;
        custoUsd += segunda.custoUsd;
      }

      // A IA só devolveu referências — busca o texto de cada uma na base
      // bíblica local antes de salvar/retornar.
      resultado = await enriquecerComTextoBiblico(bruto);

      await registrarUso(usuario.id, custoUsd);

      // Guarda a análise (só a parte gerada pela IA — sem texto bíblico
      // nem "Sobre este livro") pra reaproveitar da próxima vez que
      // alguém perguntar essa mesma referência.
      if (bruto.tipo === "analise_completa") {
        const refCanonica = analisarReferencia(bruto.dados.referencia);
        if (refCanonica) {
          await salvarAnaliseCache(chaveCanonica(refCanonica), VERSAO_PROMPT, bruto.dados);
        }
      }
    }

    await db.insert(mensagem).values([
      {
        id: randomUUID(),
        conversaId,
        role: "user",
        conteudo: { texto: data.texto },
      },
      {
        id: randomUUID(),
        conversaId,
        role: "assistant",
        conteudo: resultado,
      },
    ]);

    await db
      .update(conversa)
      .set({ updatedAt: new Date() })
      .where(eq(conversa.id, conversaId));

    return { conversaId, resposta: resultado };
  });

export const obterUsoDiario = createServerFn({ method: "GET" }).handler(
  async () => {
    const usuario = await exigirUsuario();
    const { plano, assinaturaInicioEm, creditoAjusteUsd } = usuario as unknown as {
      plano: "anual" | "semestral";
      assinaturaInicioEm: Date;
      creditoAjusteUsd: number;
    };

    const usado = await usoAcumuladoUsd(usuario.id);
    const disponivel = orcamentoAcumuladoUsd(plano, assinaturaInicioEm, creditoAjusteUsd);
    const proximo = proximoCicloEm(plano, assinaturaInicioEm);

    return {
      percentual: Math.min(100, Math.round((usado / disponivel) * 100)),
      atingiuLimite: usado >= disponivel,
      proximoCicloEm: proximo ? proximo.toISOString() : null,
    };
  },
);

export const listarConversas = createServerFn({ method: "GET" }).handler(
  async () => {
    const usuario = await exigirUsuario();

    return db.query.conversa.findMany({
      where: eq(conversa.userId, usuario.id),
      orderBy: desc(conversa.updatedAt),
    });
  },
);

export const buscarConversa = createServerFn({ method: "GET" })
  .validator((data) => z.object({ id: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const usuario = await exigirUsuario();

    const registro = await db.query.conversa.findFirst({
      where: and(eq(conversa.id, data.id), eq(conversa.userId, usuario.id)),
    });
    if (!registro) throw new Error("Conversa não encontrada");

    const mensagens = await db.query.mensagem.findMany({
      where: eq(mensagem.conversaId, data.id),
      orderBy: asc(mensagem.createdAt),
    });

    return {
      conversa: registro,
      mensagens: mensagens.map((m) => ({
        id: m.id,
        role: m.role,
        conteudo:
          m.role === "user"
            ? (m.conteudo as { texto: string })
            : (m.conteudo as RespostaChat),
        createdAt: m.createdAt,
      })),
    };
  });
