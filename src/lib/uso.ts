import { and, eq } from "drizzle-orm";

import { db } from "./db";
import { usoDiario } from "./db/app-schema";

// Preço do Claude Haiku 4.5 (o modelo usado nas análises) — em dólar por
// token. Atualize se o modelo ou o preço mudar.
const PRECO_INPUT_POR_TOKEN_USD = 1 / 1_000_000;
const PRECO_OUTPUT_POR_TOKEN_USD = 5 / 1_000_000;

const FUSO_HORARIO = "America/Sao_Paulo";
const MS_POR_DIA = 24 * 60 * 60 * 1000;

// Duração de cada plano, em dias — usada só pra calcular a proporção do
// orçamento total já "liberada" até agora (ver orcamentoAcumuladoUsd).
const DURACAO_PLANO_DIAS: Record<"anual" | "semestral", number> = {
  anual: 365,
  semestral: 182,
};

// Tamanho de cada "ciclo" de crédito — o crédito não é liberado aos
// pouquinhos a cada dia (isso deixava a primeira semana do aluno curta
// demais pra um estudo de verdade), e sim de uma vez a cada 30 dias
// corridos a partir da data da assinatura (tipo um "aniversário" mensal do
// plano, não o mês do calendário). Ver orcamentoAcumuladoUsd.
const TAMANHO_CICLO_DIAS = 30;

export function custoDaChamada(usage: {
  input_tokens: number;
  output_tokens: number;
}): number {
  return (
    usage.input_tokens * PRECO_INPUT_POR_TOKEN_USD +
    usage.output_tokens * PRECO_OUTPUT_POR_TOKEN_USD
  );
}

function dataLocalHoje(): string {
  // YYYY-MM-DD no fuso de Brasília, para o limite resetar à meia-noite local.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_HORARIO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Orçamento TOTAL do plano inteiro (não diário), em dólar — R$50/ano pro
// plano anual, metade disso (R$25) pro semestral, já que é meio preço por
// metade do tempo (o crédito por dia acaba sendo o mesmo nos dois planos).
export function orcamentoTotalPlanoUsd(plano: "anual" | "semestral"): number {
  const orcamentoAnualBrl = Number(process.env["ORCAMENTO_ANUAL_BRL"] ?? "50");
  const taxaCambio = Number(process.env["TAXA_CAMBIO_USD_BRL"] ?? "5.5");
  const orcamentoBrl = plano === "semestral" ? orcamentoAnualBrl / 2 : orcamentoAnualBrl;
  return orcamentoBrl / taxaCambio;
}

// Quantos dias do plano já foram "liberados" até agora, em blocos cheios
// de TAMANHO_CICLO_DIAS (não um valor contínuo que cresce dia a dia) —
// assim que um ciclo novo começa, o bloco inteiro fica disponível de uma
// vez, em vez de ir pingando aos poucos ao longo do mês. Nunca passa da
// duração total do plano.
function diasLiberados(plano: "anual" | "semestral", assinaturaInicioEm: Date): number {
  const duracaoDias = DURACAO_PLANO_DIAS[plano];
  const diasDecorridos =
    Math.floor((Date.now() - assinaturaInicioEm.getTime()) / MS_POR_DIA) + 1;
  const diasValidos = Math.min(Math.max(diasDecorridos, 1), duracaoDias);
  const cicloAtual = Math.ceil(diasValidos / TAMANHO_CICLO_DIAS);
  return Math.min(cicloAtual * TAMANHO_CICLO_DIAS, duracaoDias);
}

// Crédito acumulado ATÉ AGORA — liberado em blocos de 30 dias corridos
// desde o início da assinatura (não um valor fixo por dia que reseta e se
// perde). Se o aluno não gastar tudo num ciclo, esse crédito continua
// disponível nos ciclos seguintes, até o teto do orçamento total do plano
// (nunca ultrapassa o valor total, mesmo depois do plano vencer).
export function orcamentoAcumuladoUsd(
  plano: "anual" | "semestral",
  assinaturaInicioEm: Date,
  // Ajuste manual do administrador (positivo ou negativo) — ver
  // src/lib/admin.functions.ts.
  ajusteUsd = 0,
): number {
  const duracaoDias = DURACAO_PLANO_DIAS[plano];
  const liberados = diasLiberados(plano, assinaturaInicioEm);
  return Math.max(0, orcamentoTotalPlanoUsd(plano) * (liberados / duracaoDias) + ajusteUsd);
}

// Quando o próximo bloco de crédito (30 dias corridos, a partir da data da
// assinatura) libera — null se o plano já liberou tudo que tinha (o aluno
// precisa renovar ou pedir um ajuste manual de crédito ao suporte).
export function proximoCicloEm(
  plano: "anual" | "semestral",
  assinaturaInicioEm: Date,
): Date | null {
  const duracaoDias = DURACAO_PLANO_DIAS[plano];
  const liberados = diasLiberados(plano, assinaturaInicioEm);
  if (liberados >= duracaoDias) return null;
  return new Date(assinaturaInicioEm.getTime() + liberados * MS_POR_DIA);
}

// Soma de tudo que o usuário já gastou, em todos os dias — comparado
// contra orcamentoAcumuladoUsd() pra saber se ainda tem crédito disponível.
export async function usoAcumuladoUsd(userId: string): Promise<number> {
  const registros = await db.query.usoDiario.findMany({
    where: eq(usoDiario.userId, userId),
  });
  return registros.reduce((soma, r) => soma + r.custoUsd, 0);
}

export async function registrarUso(userId: string, custoUsd: number) {
  const hoje = dataLocalHoje();
  const existente = await db.query.usoDiario.findFirst({
    where: and(eq(usoDiario.userId, userId), eq(usoDiario.data, hoje)),
  });

  if (existente) {
    await db
      .update(usoDiario)
      .set({ custoUsd: existente.custoUsd + custoUsd, updatedAt: new Date() })
      .where(and(eq(usoDiario.userId, userId), eq(usoDiario.data, hoje)));
  } else {
    await db.insert(usoDiario).values({ userId, data: hoje, custoUsd });
  }
}
