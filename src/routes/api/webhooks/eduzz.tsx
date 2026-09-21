import { createFileRoute } from "@tanstack/react-router";
import { json } from "@tanstack/react-start";

export const Route = createFileRoute("/api/webhooks/eduzz")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // A Eduzz normalmente envia um token compartilhado — o nome exato
        // do parâmetro/cabeçalho e o formato do payload (form-urlencoded)
        // só dá pra confirmar com a documentação real deles. Por enquanto,
        // aceitamos o segredo tanto via header quanto via query string.
        const segredoEsperado = process.env["EDUZZ_WEBHOOK_SECRET"];
        const segredoRecebido =
          request.headers.get("x-eduzz-secret") ??
          new URL(request.url).searchParams.get("secret");

        if (!segredoEsperado || segredoRecebido !== segredoEsperado) {
          console.warn("[webhook eduzz] chamada recusada: segredo ausente ou incorreto");
          return json({ erro: "não autorizado" }, { status: 401 });
        }

        // TODO (quando a integração for ligada de verdade):
        // 1. Ler o payload real da Eduzz (ela manda como form-urlencoded,
        //    não JSON) e extrair evento, e-mail e nome do comprador, e o
        //    identificador da transação.
        // 2. Só provisionar acesso quando o evento for de compra aprovada
        //    (ignorar reembolso/cancelamento — nesse caso, revogar acesso).
        // 3. Chamar `provisionarAcessoEduzz` de `src/lib/eduzz.ts` com os
        //    dados extraídos.
        const payload = await request.text();
        console.warn(
          "[webhook eduzz] recebido (segredo válido), mas a integração ainda não está implementada:",
          payload,
        );

        return json(
          { recebido: true, implementado: false },
          { status: 200 },
        );
      },
    },
  },
});
