import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";

import { db } from "./db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
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
