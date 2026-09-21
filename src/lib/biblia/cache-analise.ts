import { eq } from "drizzle-orm";

import { db } from "../db";
import { analiseCache } from "../db/app-schema";
import type { AnaliseContextualIa } from "../schemas";
import { analisarReferencia, chaveCanonica } from "./referencia";

// Só vale a pena checar o cache ANTES de chamar a IA quando a mensagem do
// usuário é uma referência "limpa" (nada além da referência em si — ex.:
// "João 3:16"), porque é esse o único caso em que dá pra saber, sem
// perguntar pra IA, que a resposta será do tipo "analise_completa" e que
// referência exata está sendo pedida.
export function chaveCacheavel(textoUsuario: string): string | null {
  const ref = analisarReferencia(textoUsuario.trim());
  return ref ? chaveCanonica(ref) : null;
}

export async function buscarAnaliseCache(
  chave: string,
  versaoPrompt: number,
): Promise<AnaliseContextualIa | null> {
  const registro = await db.query.analiseCache.findFirst({
    where: eq(analiseCache.chave, chave),
  });
  if (!registro || registro.versaoPrompt !== versaoPrompt) return null;
  return registro.dados as AnaliseContextualIa;
}

export async function salvarAnaliseCache(
  chave: string,
  versaoPrompt: number,
  dados: AnaliseContextualIa,
): Promise<void> {
  const existente = await db.query.analiseCache.findFirst({
    where: eq(analiseCache.chave, chave),
  });

  if (existente) {
    await db
      .update(analiseCache)
      .set({ versaoPrompt, dados, updatedAt: new Date() })
      .where(eq(analiseCache.chave, chave));
  } else {
    await db.insert(analiseCache).values({ chave, versaoPrompt, dados });
  }
}
