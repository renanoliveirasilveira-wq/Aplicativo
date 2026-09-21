import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { Resend } from "resend";

import { db } from "./db";

const resend = process.env["RESEND_API_KEY"]
  ? new Resend(process.env["RESEND_API_KEY"])
  : null;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
    // Usado tanto pelo "esqueci minha senha" (login) quanto pelo fluxo da
    // Eduzz: quando uma compra é aprovada, a conta é criada com uma senha
    // aleatória que ninguém sabe, e esse e-mail é o único jeito do aluno
    // definir a senha de verdade — ver provisionarAcessoEduzz em
    // src/lib/eduzz.ts. Sem RESEND_API_KEY configurada (ex.: em dev
    // local), fica só um aviso no console em vez de quebrar o app.
    sendResetPassword: async ({ user, url }) => {
      if (!resend) {
        console.warn(
          `[auth] RESEND_API_KEY não configurada — e-mail de redefinição de senha não enviado. Link: ${url}`,
        );
        return;
      }
      const remetente = process.env["EMAIL_FROM"];
      if (!remetente) {
        console.warn("[auth] EMAIL_FROM não configurada — e-mail de redefinição não enviado.");
        return;
      }
      const { error } = await resend.emails.send({
        from: remetente,
        to: user.email,
        subject: "Defina sua senha — Manual de Contextualização Bíblica",
        html: `
          <p>Olá${user.name ? `, ${user.name}` : ""}!</p>
          <p>Clique no link abaixo para definir a senha da sua conta no Manual de Contextualização Bíblica:</p>
          <p><a href="${url}">${url}</a></p>
          <p>Se você não reconhece essa solicitação, pode ignorar este e-mail.</p>
        `,
      });
      if (error) {
        console.error("[auth] falha ao enviar e-mail de redefinição de senha:", error);
      }
    },
  },
  // Dá o painel administrativo (src/routes/admin.tsx) pra criar, bloquear
  // e remover alunos sem depender da Eduzz — ver
  // src/lib/admin.functions.ts. `role`/`banned`/`banReason`/`banExpires`
  // já vêm prontos desse plugin, não são campos nossos.
  plugins: [
    admin({
      bannedUserMessage:
        "Seu acesso foi bloqueado. Entre em contato com o suporte se acha que isso é um engano.",
    }),
  ],
  user: {
    additionalFields: {
      creditoAjusteUsd: {
        type: "number",
        required: false,
        defaultValue: 0,
        input: false,
      },
      status: {
        type: "string",
        required: false,
        defaultValue: "active",
        input: false,
      },
      eduzzTransactionId: {
        type: "string",
        required: false,
        input: false,
      },
      termosAceitosEm: {
        type: "date",
        required: false,
        input: false,
      },
      plano: {
        type: "string",
        required: false,
        defaultValue: "anual",
        input: false,
      },
      assinaturaInicioEm: {
        type: "date",
        required: false,
        input: false,
      },
    },
    validateUserInfo: async ({
      source,
    }: {
      source: { action: string; method: string };
    }) => {
      // Cadastro aberto por e-mail/senha é só para testes internos, até o
      // webhook da Eduzz estar ligado (ver src/routes/api/webhooks/eduzz.tsx).
      // Defina ALLOW_SELF_SIGNUP=true no .env para permitir novamente.
      if (
        source.action === "create-user" &&
        source.method === "email-password" &&
        process.env["ALLOW_SELF_SIGNUP"] !== "true"
      ) {
        return {
          error: "signup_disabled",
          errorDescription:
            "O cadastro aberto está desativado. O acesso é liberado automaticamente após a compra do curso.",
        };
      }
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
  },
  // Protege contra força bruta em login/cadastro e abuso de outros endpoints
  // de autenticação. Em produção já vem ligado por padrão, mas deixamos
  // explícito para não depender só disso.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 20,
  },
});
