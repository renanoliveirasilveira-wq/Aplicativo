import { and, asc, eq, gte, lte } from "drizzle-orm";

import { db } from "../db";
import { versiculoBiblico } from "../db/app-schema";
import { analisarReferencia } from "./referencia";

export type VersiculoResolvido = { versiculo: number; texto: string };

// Busca os versículos de uma referência na base bíblica local, um por um
// (número + texto), pra exibir no formato tradicional da Bíblia. Retorna
// null se a referência não puder ser interpretada ou não existir na base —
// nesse caso o app só deixa de mostrar a citação, sem quebrar a resposta.
export async function buscarVersiculosPorReferencia(
  referenciaTexto: string | null | undefined,
): Promise<VersiculoResolvido[] | null> {
  if (!referenciaTexto) return null;

  const ref = analisarReferencia(referenciaTexto);
  if (!ref) return null;

  const condicoes = [
    eq(versiculoBiblico.livro, ref.livroId),
    eq(versiculoBiblico.capitulo, ref.capitulo),
  ];
  if (ref.versiculoInicio != null) {
    condicoes.push(gte(versiculoBiblico.versiculo, ref.versiculoInicio));
    condicoes.push(lte(versiculoBiblico.versiculo, ref.versiculoFim ?? ref.versiculoInicio));
  }

  const linhas = await db.query.versiculoBiblico.findMany({
    where: and(...condicoes),
    orderBy: asc(versiculoBiblico.versiculo),
  });
  if (!linhas.length) return null;

  return linhas.map((l) => ({ versiculo: l.versiculo, texto: l.texto }));
}

// Mesma busca, mas como um texto corrido único — usado onde não faz
// sentido exibir versículo por versículo (ex.: as citações do Passo 2, ou
// o resumo de contexto que vai pro histórico da conversa).
export async function buscarTextoPorReferencia(
  referenciaTexto: string | null | undefined,
): Promise<string | null> {
  const versiculos = await buscarVersiculosPorReferencia(referenciaTexto);
  if (!versiculos) return null;

  const mostrarNumeros = versiculos.length > 1;
  return versiculos
    .map((v) => (mostrarNumeros ? `${v.versiculo} ${v.texto}` : v.texto))
    .join(" ");
}
