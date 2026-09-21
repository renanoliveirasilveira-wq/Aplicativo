import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";

import { auth } from "./auth";
import { db } from "./db";
import { user } from "./db/schema";

type ProvisionarAcessoInput = {
  email: string;
  nome: string;
  eduzzTransactionId: string;
};

/**
 * Cria (ou reativa) o acesso de um comprador vindo da Eduzz.
 * Chamada pelo webhook em `src/routes/api/webhooks/eduzz.tsx` assim que o
 * evento de compra aprovada estiver mapeado — ver TODO nesse arquivo.
 */
export async function provisionarAcessoEduzz({
  email,
  nome,
  eduzzTransactionId,
}: ProvisionarAcessoInput) {
  const existente = await db.query.user.findFirst({
    where: eq(user.email, email),
  });

  if (existente) {
    await db
      .update(user)
      .set({ status: "active", eduzzTransactionId })
      .where(eq(user.email, email));
    return { criado: false };
  }

  const senhaTemporaria = randomBytes(24).toString("base64url");
  await auth.api.signUpEmail({
    body: { email, name: nome, password: senhaTemporaria },
  });

  await db
    .update(user)
    .set({ status: "active", eduzzTransactionId })
    .where(eq(user.email, email));

  // TODO: disparar e-mail de "defina sua senha" (reset de senha do
  // better-auth) em vez de deixar a senha temporária apenas nos logs.
  return { criado: true };
}
