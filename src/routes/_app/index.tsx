import { createFileRoute } from "@tanstack/react-router";

import Chat from "@/components/Chat";

export const Route = createFileRoute("/_app/")({
  // "sessao" não é usado pra nada além de forçar uma conversa nova: o
  // link "Nova conversa" da barra lateral navega pra cá com um valor novo
  // toda vez, e usamos esse valor como `key` do Chat abaixo — trocar a
  // `key` faz o React remontar o componente do zero, mesmo que o usuário
  // já estivesse nesta mesma página no meio de uma conversa.
  validateSearch: (search: Record<string, unknown>): { sessao?: string } => ({
    sessao: typeof search.sessao === "string" ? search.sessao : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Manual de Contextualização Bíblica — Ajuste Interpretativo" },
      {
        name: "description",
        content:
          "Pesquisa bíblica objetiva: contexto histórico, cultural, geográfico e conexões internas das Escrituras, sem interpretação.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { sessao } = Route.useSearch();
  return <Chat key={sessao ?? "inicial"} />;
}
