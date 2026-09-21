import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { auth } from "./auth";
import { orcamentoAcumuladoUsd, usoAcumuladoUsd } from "./uso";
import { db } from "./db";
import { user } from "./db/schema";

async function exigirAdmin() {
  const headers = getRequestHeaders() as unknown as Headers;
  const session = await auth.api.getSession({ headers });
  if (!session) throw new Error("Não autenticado");
  if ((session.user as unknown as { role?: string }).role !== "admin") {
    throw new Error("Acesso restrito ao administrador");
  }
  return { headers, usuario: session.user };
}

export const listarAlunos = createServerFn({ method: "GET" }).handler(
  async () => {
    await exigirAdmin();

    const alunos = await db.query.user.findMany({
      orderBy: (u, { desc }) => [desc(u.createdAt)],
    });

    return Promise.all(
      alunos.map(async (aluno) => {
        const dadosPlano = aluno as unknown as {
          plano: "anual" | "semestral";
          assinaturaInicioEm: Date;
          creditoAjusteUsd: number;
          role: string | null;
          banned: boolean | null;
          banReason: string | null;
        };
        const usado = await usoAcumuladoUsd(aluno.id);
        const disponivel = orcamentoAcumuladoUsd(
          dadosPlano.plano,
          dadosPlano.assinaturaInicioEm,
          dadosPlano.creditoAjusteUsd,
        );

        return {
          id: aluno.id,
          nome: aluno.name,
          email: aluno.email,
          criadoEm: aluno.createdAt.toISOString(),
          plano: dadosPlano.plano,
          assinaturaInicioEm: dadosPlano.assinaturaInicioEm.toISOString(),
          creditoAjusteUsd: dadosPlano.creditoAjusteUsd,
          role: dadosPlano.role,
          bloqueado: dadosPlano.banned ?? false,
          motivoBloqueio: dadosPlano.banReason,
          usoAcumuladoUsd: usado,
          orcamentoAcumuladoUsd: disponivel,
          percentualUsado: Math.min(100, Math.round((usado / disponivel) * 100)),
        };
      }),
    );
  },
);

export const criarAlunoManual = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        nome: z.string().min(1),
        email: z.string().email(),
        senha: z.string().min(8),
        plano: z.enum(["anual", "semestral"]).default("anual"),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { headers } = await exigirAdmin();

    const resultado = await auth.api.createUser({
      body: { email: data.email, name: data.nome, password: data.senha, role: "user" },
      headers,
    });

    await db
      .update(user)
      .set({ plano: data.plano })
      .where(eq(user.id, resultado.user.id));

    return { id: resultado.user.id };
  });

export const atualizarPlanoAluno = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        userId: z.string().min(1),
        plano: z.enum(["anual", "semestral"]).optional(),
        // ISO string — se enviado, redefine a data de início da assinatura
        // (empurrar pra trás = dá mais crédito acumulado imediatamente).
        assinaturaInicioEm: z.string().datetime().optional(),
        creditoAjusteUsd: z.number().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await exigirAdmin();

    const valores: Record<string, unknown> = {};
    if (data.plano !== undefined) valores.plano = data.plano;
    if (data.assinaturaInicioEm !== undefined) {
      valores.assinaturaInicioEm = new Date(data.assinaturaInicioEm);
    }
    if (data.creditoAjusteUsd !== undefined) valores.creditoAjusteUsd = data.creditoAjusteUsd;

    if (Object.keys(valores).length === 0) return { atualizado: false };

    await db.update(user).set(valores).where(eq(user.id, data.userId));
    return { atualizado: true };
  });

export const bloquearAluno = createServerFn({ method: "POST" })
  .validator((data) =>
    z.object({ userId: z.string().min(1), motivo: z.string().optional() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { headers } = await exigirAdmin();
    await auth.api.banUser({
      body: { userId: data.userId, banReason: data.motivo },
      headers,
    });
    return { bloqueado: true };
  });

export const desbloquearAluno = createServerFn({ method: "POST" })
  .validator((data) => z.object({ userId: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const { headers } = await exigirAdmin();
    await auth.api.unbanUser({ body: { userId: data.userId }, headers });
    return { bloqueado: false };
  });

export const excluirAlunoPermanentemente = createServerFn({ method: "POST" })
  .validator((data) => z.object({ userId: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const { headers } = await exigirAdmin();
    await auth.api.removeUser({ body: { userId: data.userId }, headers });
    return { excluido: true };
  });

export const definirSenhaAluno = createServerFn({ method: "POST" })
  .validator((data) =>
    z.object({ userId: z.string().min(1), novaSenha: z.string().min(8) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { headers } = await exigirAdmin();
    await auth.api.setUserPassword({
      body: { userId: data.userId, newPassword: data.novaSenha },
      headers,
    });
    return { definida: true };
  });
