import { eq } from "drizzle-orm";

import { db } from "./db";
import { mensagemPadrao } from "./db/app-schema";

// Mensagem de reserva caso a tabela ainda não tenha sido semeada (ver
// scripts/seed-mensagens-padrao.mjs) — nunca deve aparecer em produção,
// mas evita que o app quebre se isso acontecer.
const RESERVA =
  "Esse espaço é feito pra te dar dados e contexto sobre o texto bíblico, não pra interpretar por você. Tenta reformular sua pergunta focando no contexto histórico, cultural ou literário do texto.";

export async function buscarMensagemPadrao(chave: string): Promise<string> {
  const registro = await db.query.mensagemPadrao.findFirst({
    where: eq(mensagemPadrao.chave, chave),
  });
  return registro?.texto ?? RESERVA;
}
