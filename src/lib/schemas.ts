import { z } from "zod";

// ---- Schemas usados para pedir a saída estruturada da IA ----
// A IA nunca gera o texto do versículo em si, só a referência. O texto
// real vem da base bíblica local (Almeida 1911, domínio público — ver
// src/lib/biblia), buscado a partir da referência depois da resposta da
// IA. Isso evita reproduzir texto de traduções com direitos autorais e
// evita que o custo de saída escale com o tamanho da passagem pedida
// (ex.: pedir um capítulo inteiro).

// Cada chamada cria uma instância nova (não reaproveitada) do schema. A
// Anthropic rejeita `$defs`/referências compartilhadas dentro de uniões
// (`anyOf`), que é o que o Zod gera quando o mesmo objeto de schema é
// reutilizado em mais de um lugar.
function criarReferenciaComentadaIaSchema() {
  return z.object({
    referencia: z.string(),
    descricao: z.string(),
  });
}

export const AnaliseContextualIaSchema = z.object({
  referencia: z.string(),
  // contexto_geral_do_livro/contexto_literario_do_livro NÃO fazem parte
  // do que a IA gera mais — é o mesmo texto pra qualquer versículo do
  // mesmo livro, então foi pré-gerado uma única vez por livro (ver
  // scripts/gerar-contexto-livros.mjs) e é buscado localmente a partir do
  // livro da "referencia" acima, igual ao texto bíblico.
  passo_1_contexto: z.object({
    quem_escreveu: z.string().nullable(),
    contexto_historico_cultural: z.string().nullable(),
    geografia: z.string().nullable(),
    orientacao_leitura: z.string().nullable(),
    // O teto de quantidade (3 curiosidades) é imposto só via instrução no
    // prompt de sistema — usar `.max()` aqui faria o Zod gerar `$defs`,
    // que a Anthropic rejeita dentro de uma união (`anyOf`).
    curiosidades: z.array(z.string()),
    observacoes_adicionais: z.string().nullable(),
  }),
  passo_2_interpretacao_biblia_com_biblia: z.object({
    referencias_relacionadas: z.array(criarReferenciaComentadaIaSchema()),
    textos_paralelos: z.array(criarReferenciaComentadaIaSchema()),
    padroes_biblicos: z.array(
      z.object({ padrao: z.string(), descricao: z.string() }),
    ),
  }),
});

export type AnaliseContextualIa = z.infer<typeof AnaliseContextualIaSchema>;

// "fora_do_escopo" — usado quando o pedido busca interpretação, aplicação
// pessoal, opinião, ou qualquer coisa fora do que esse aplicativo se
// propõe a entregar (dados objetivos de contextualização). A IA só sinaliza
// esse tipo, sem escrever nenhum texto — a resposta em si é uma mensagem
// fixa, guardada no banco (ver src/lib/mensagens-padrao.ts), pra não gastar
// tokens de saída reescrevendo a mesma recusa gentil toda vez.
export const RespostaChatIaSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("analise_completa"),
    dados: AnaliseContextualIaSchema,
  }),
  z.object({
    tipo: z.literal("resposta_especifica"),
    referencia: z.string().nullable(),
    resposta: z.string(),
  }),
  z.object({
    tipo: z.literal("fora_do_escopo"),
  }),
]);

export type RespostaChatIa = z.infer<typeof RespostaChatIaSchema>;

// ---- Schemas do resultado final (após enriquecer com o texto local) ----
// É essa forma que fica salva no banco e é usada pelos componentes de
// tela — igual ao formato de antes, só que "texto" agora vem de uma busca
// local em vez de ser gerado pela IA, por isso é nullable (a referência
// pode, em casos raros, não ser reconhecida pelo parser local).

function criarReferenciaDescritaSchema() {
  return z.object({
    referencia: z.string(),
    texto: z.string().nullable(),
    descricao: z.string(),
  });
}

// Um versículo já resolvido (número + texto), pra exibir no formato
// tradicional da Bíblia — um versículo por linha, com o número na frente —
// em vez de um parágrafo corrido.
function criarVersiculoSchema() {
  return z.object({
    versiculo: z.number(),
    texto: z.string(),
  });
}

export const AnaliseContextualSchema = z.object({
  // Buscado localmente (não gerado pela IA) — nullable só pro caso raro da
  // referência não ser reconhecida pelo parser local.
  versiculos: z.array(criarVersiculoSchema()).nullable(),
  referencia: z.string(),
  passo_1_contexto: z.object({
    // Buscados localmente (não gerados pela IA) — nullable só pro caso
    // raro da referência não ser reconhecida pelo parser local.
    contexto_geral_do_livro: z.string().nullable(),
    contexto_literario_do_livro: z.string().nullable(),
    quem_escreveu: z.string().nullable(),
    contexto_historico_cultural: z.string().nullable(),
    geografia: z.string().nullable(),
    orientacao_leitura: z.string().nullable(),
    curiosidades: z.array(z.string()),
    observacoes_adicionais: z.string().nullable(),
  }),
  passo_2_interpretacao_biblia_com_biblia: z.object({
    referencias_relacionadas: z.array(criarReferenciaDescritaSchema()),
    textos_paralelos: z.array(criarReferenciaDescritaSchema()),
    padroes_biblicos: z.array(
      z.object({ padrao: z.string(), descricao: z.string() }),
    ),
  }),
  // O Passo 3 (Orar e Labutar) é sempre o mesmo texto fixo — não faz
  // sentido pagar pra IA gerá-lo. Ele é renderizado direto no componente
  // (ver AnaliseResultado.tsx), fora deste schema.
});

export type AnaliseContextual = z.infer<typeof AnaliseContextualSchema>;

export const RespostaChatSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("analise_completa"),
    dados: AnaliseContextualSchema,
  }),
  z.object({
    tipo: z.literal("resposta_especifica"),
    referencia: z.string().nullable(),
    // Versículos da referência citada, buscados localmente (não gerados
    // pela IA) — usado só pra exibição, pode ser null.
    versiculosReferencia: z.array(criarVersiculoSchema()).nullable(),
    resposta: z.string(),
  }),
  z.object({
    tipo: z.literal("fora_do_escopo"),
    // Preenchida no servidor a partir da mensagem padrão guardada no
    // banco (ver src/lib/mensagens-padrao.ts) — nunca gerada pela IA.
    mensagem: z.string(),
  }),
  z.object({
    tipo: z.literal("referencia_nao_reconhecida"),
    // Detectado e resolvido localmente, ANTES de chamar a IA (ver
    // src/lib/biblia/referencia.ts) — evita que um erro de digitação no
    // nome do livro (ex.: "Jucas" em vez de "Lucas") seja mal interpretado
    // como um pedido fora do escopo.
    mensagem: z.string(),
    // Referência corrigida pronta pra reenviar, se achamos um livro
    // parecido o suficiente (ex.: "Lucas 15:12"). Null se não achamos
    // nenhum candidato próximo.
    sugestao: z.string().nullable(),
  }),
]);

export type RespostaChat = z.infer<typeof RespostaChatSchema>;
