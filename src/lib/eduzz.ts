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
 * Cria (ou reativa) o acesso de um comprador vindo da Eduzz. Chamada pelo
 * webhook em `src/routes/api/webhooks/eduzz.tsx` quando uma fatura é paga.
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
    // Reativa (cobre o caso de reembolso seguido de nova compra, por
    // exemplo) e desbanir, se estava banido por revogação anterior.
    await db
      .update(user)
      .set({ status: "active", eduzzTransactionId })
      .where(eq(user.email, email));
    if ((existente as unknown as { banned?: boolean }).banned) {
      await auth.api.unbanUser({ body: { userId: existente.id } });
    }
    return { criado: false };
  }

  // A conta precisa nascer com alguma senha (o better-auth exige uma no
  // signUpEmail), mas ninguém nunca vai usá-la — logo em seguida
  // disparamos o fluxo de "definir senha" por e-mail (ver
  // sendResetPassword em src/lib/auth.ts), que é o único jeito real do
  // aluno entrar na conta pela primeira vez.
  const senhaTemporaria = randomBytes(32).toString("base64url");
  const resultado = await auth.api.signUpEmail({
    body: { email, name: nome, password: senhaTemporaria },
  });

  await db
    .update(user)
    .set({ status: "active", eduzzTransactionId })
    .where(eq(user.email, email));

  await auth.api.requestPasswordReset({
    body: { email, redirectTo: "/definir-senha" },
  });

  return { criado: true, userId: resultado.user.id };
}

/**
 * Revoga o acesso de um aluno (cancelamento ou reembolso vindos da Eduzz).
 * Usa o mecanismo de banimento do próprio plugin admin do better-auth —
 * o mesmo que o painel administrativo já usa em bloquearAluno (ver
 * src/lib/admin.functions.ts) — pra bloquear login sem apagar a conta,
 * caso a pessoa recompre depois.
 */
export async function revogarAcessoEduzz(email: string) {
  const existente = await db.query.user.findFirst({
    where: eq(user.email, email),
  });
  if (!existente) return { revogado: false };

  await db.update(user).set({ status: "inactive" }).where(eq(user.email, email));
  await auth.api.banUser({
    body: {
      userId: existente.id,
      banReason: "Acesso revogado — cancelamento ou reembolso via Eduzz",
    },
  });
  return { revogado: true };
}
