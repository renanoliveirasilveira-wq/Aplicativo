import { eq } from "drizzle-orm";

import { db } from "../db";
import { contextoLivro } from "../db/app-schema";

export type ContextoLivro = {
  contextoGeral: string;
  contextoLiterario: string;
};

// Busca o bloco "Sobre este livro" pré-gerado (ver scripts/gerar-contexto-livros.mjs).
// Retorna null se o livro não tiver contexto gerado ainda — nesse caso o
// app só deixa de mostrar esse bloco, sem quebrar a resposta.
export async function buscarContextoLivro(
  livroId: string | null | undefined,
): Promise<ContextoLivro | null> {
  if (!livroId) return null;

  const registro = await db.query.contextoLivro.findFirst({
    where: eq(contextoLivro.livro, livroId),
  });
  if (!registro) return null;

  return {
    contextoGeral: registro.contextoGeral,
    contextoLiterario: registro.contextoLiterario,
  };
}
