import { eq } from "drizzle-orm";

import { auth } from "./auth";
import { db } from "./db";
import { session, user } from "./db/schema";

type ProvisionarAcessoInput = {
  email: string;
  nome: string;
  eduzzTransactionId: string;
  plano: "anual" | "semestral";
};

/**
 * Cria (ou reativa) o acesso de um comprador vindo da Eduzz. Chamada pelo
 * webhook em `src/routes/api/webhooks/eduzz.tsx` quando uma fatura é paga.
 */
export async function provisionarAcessoEduzz({
  email,
  nome,
  eduzzTransactionId,
  plano,
}: ProvisionarAcessoInput) {
  const existente = await db.query.user.findFirst({
    where: eq(user.email, email),
  });

  // A data de início da assinatura é o que o cálculo de orçamento de IA
  // usa pra saber quanto crédito já foi liberado (ver
  // orcamentoAcumuladoUsd em src/lib/uso.ts) — sem ela definida, o
  // cálculo quebra. Uma compra nova (seja conta nova ou reativação)
  // reinicia o ciclo a partir de agora.
  const assinaturaInicioEm = new Date();

  if (existente) {
    // Reativa (cobre o caso de reembolso seguido de nova compra, por
    // exemplo) e desbane, se estava banido por revogação anterior — igual
    // ao que auth.api.unbanUser faria, só que direto no banco: o
    // middleware do plugin admin exige uma sessão de admin autenticada, e
    // aqui não existe uma (quem está chamando é o webhook, não uma
    // pessoa logada).
    await db
      .update(user)
      .set({
        status: "active",
        eduzzTransactionId,
        plano,
        assinaturaInicioEm,
        banned: false,
        banExpires: null,
        banReason: null,
      })
      .where(eq(user.email, email));
    return { criado: false };
  }

  // auth.api.createUser (do plugin admin) — não auth.api.signUpEmail —
  // porque signUpEmail passa pela mesma trava de ALLOW_SELF_SIGNUP do
  // cadastro público (ver validateUserInfo em src/lib/auth.ts), e essa
  // trava bloquearia justamente as contas que a Eduzz manda criar depois
  // de uma compra aprovada. createUser não tem essa restrição.
  const resultado = await auth.api.createUser({
    body: { email, name: nome, password: crypto.randomUUID(), role: "user" },
  });

  await db
    .update(user)
    .set({ status: "active", eduzzTransactionId, plano, assinaturaInicioEm })
    .where(eq(user.email, email));

  // A conta nasce com uma senha aleatória que ninguém sabe — esse e-mail
  // é o único jeito real do aluno definir a senha e conseguir entrar pela
  // primeira vez (ver sendResetPassword em src/lib/auth.ts).
  await auth.api.requestPasswordReset({
    body: { email, redirectTo: "/definir-senha" },
  });

  return { criado: true, userId: resultado.user.id };
}

/**
 * Revoga o acesso de um aluno (cancelamento ou reembolso vindos da
 * Eduzz). Reproduz direto no banco o que auth.api.banUser faz (banned +
 * motivo + derruba as sessões ativas), sem passar pela API — ela exige
 * uma sessão de admin autenticada, que não existe num webhook.
 */
export async function revogarAcessoEduzz(email: string) {
  const existente = await db.query.user.findFirst({
    where: eq(user.email, email),
  });
  if (!existente) return { revogado: false };

  await db
    .update(user)
    .set({
      status: "inactive",
      banned: true,
      banReason: "Acesso revogado — cancelamento ou reembolso via Eduzz",
      banExpires: null,
    })
    .where(eq(user.email, email));

  // Derruba sessões ativas — sem isso, quem já estava logado continuaria
  // com acesso até o cookie expirar sozinho.
  await db.delete(session).where(eq(session.userId, existente.id));

  return { revogado: true };
}
