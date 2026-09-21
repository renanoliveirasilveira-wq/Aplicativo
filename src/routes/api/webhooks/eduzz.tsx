import { createHmac, timingSafeEqual } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { json } from "@tanstack/react-start";

import { provisionarAcessoEduzz, revogarAcessoEduzz } from "@/lib/eduzz";

// Eventos de fatura da Eduzz (Webhook v3 — https://developers.eduzz.com/)
// que nos interessam. Qualquer outro evento (assinatura, abandono de
// carrinho, etc.) é só confirmado (200) sem nenhuma ação.
const EVENTOS_LIBERA_ACESSO = new Set(["myeduzz.invoice_paid"]);
const EVENTOS_REVOGA_ACESSO = new Set([
  "myeduzz.invoice_canceled",
  "myeduzz.invoice_waiting_refund",
  "myeduzz.invoice_refunded",
]);

type PessoaEduzz = { name?: string; email?: string } | undefined;

type PayloadEduzz = {
  event?: string;
  data?: {
    buyer?: PessoaEduzz;
    // Em produtos com "quem estuda é diferente de quem paga", o acesso
    // deve ir pro aluno, não pra quem comprou — cai pro buyer quando não
    // houver um student separado.
    student?: PessoaEduzz;
    transaction?: { id?: string };
    id?: string;
  };
};

function assinaturaValida(corpoBruto: string, assinaturaRecebida: string | null): boolean {
  const segredo = process.env["EDUZZ_WEBHOOK_SECRET"];
  if (!segredo || !assinaturaRecebida) return false;

  const assinaturaEsperada = createHmac("sha256", segredo).update(corpoBruto).digest("hex");

  // Comparação em tempo constante — evita vazar informação sobre a
  // assinatura certa através do tempo de resposta.
  const bufferRecebido = Buffer.from(assinaturaRecebida);
  const bufferEsperado = Buffer.from(assinaturaEsperada);
  if (bufferRecebido.length !== bufferEsperado.length) return false;
  return timingSafeEqual(bufferRecebido, bufferEsperado);
}

export const Route = createFileRoute("/api/webhooks/eduzz")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // A assinatura HMAC precisa ser calculada sobre os BYTES exatos do
        // corpo recebido — por isso lemos como texto primeiro, e só depois
        // fazemos JSON.parse, em vez de deixar o framework parsear direto.
        const corpoBruto = await request.text();
        const assinaturaRecebida = request.headers.get("x-signature");

        if (!assinaturaValida(corpoBruto, assinaturaRecebida)) {
          console.warn("[webhook eduzz] assinatura ausente ou inválida — recusado");
          return json({ erro: "não autorizado" }, { status: 401 });
        }

        let payload: PayloadEduzz;
        try {
          payload = JSON.parse(corpoBruto);
        } catch {
          console.warn("[webhook eduzz] corpo não é JSON válido");
          return json({ erro: "payload inválido" }, { status: 400 });
        }

        const evento = payload.event;
        const pessoa = payload.data?.student ?? payload.data?.buyer;
        const email = pessoa?.email;

        if (evento && EVENTOS_LIBERA_ACESSO.has(evento)) {
          if (!email) {
            console.warn(`[webhook eduzz] evento ${evento} sem e-mail de comprador/aluno`);
            return json({ recebido: true, erro: "sem e-mail" }, { status: 200 });
          }
          const resultado = await provisionarAcessoEduzz({
            email,
            nome: pessoa?.name ?? email,
            eduzzTransactionId:
              payload.data?.transaction?.id ?? payload.data?.id ?? "desconhecido",
          });
          console.log(
            `[webhook eduzz] acesso ${resultado.criado ? "criado" : "reativado"} para ${email}`,
          );
          return json({ recebido: true }, { status: 200 });
        }

        if (evento && EVENTOS_REVOGA_ACESSO.has(evento)) {
          if (!email) {
            console.warn(`[webhook eduzz] evento ${evento} sem e-mail de comprador/aluno`);
            return json({ recebido: true, erro: "sem e-mail" }, { status: 200 });
          }
          const resultado = await revogarAcessoEduzz(email);
          console.log(
            `[webhook eduzz] acesso ${resultado.revogado ? "revogado" : "ignorado (não encontrado)"} para ${email}`,
          );
          return json({ recebido: true }, { status: 200 });
        }

        // Evento que não tratamos (ex.: fatura agendada, abandono de
        // carrinho) — confirma recebimento sem fazer nada, pra Eduzz não
        // ficar retentando à toa.
        console.log(`[webhook eduzz] evento "${evento}" recebido, sem ação configurada`);
        return json({ recebido: true }, { status: 200 });
      },
    },
  },
});
