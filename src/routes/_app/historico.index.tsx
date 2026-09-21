import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { History } from "lucide-react";

import { listarConversas } from "@/lib/chat.functions";

export const Route = createFileRoute("/_app/historico/")({
  head: () => ({
    meta: [{ title: "Histórico — Manual de Contextualização Bíblica" }],
  }),
  component: Historico,
});

function formatarData(data: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(data));
}

function Historico() {
  const fn = useServerFn(listarConversas);
  const { data, isLoading } = useQuery({
    queryKey: ["conversas"],
    queryFn: () => fn(),
  });

  return (
    <main className="page-wrap px-4 py-12 sm:py-16">
      <header>
        <p className="label-caps">Suas conversas</p>
        <h1 className="font-display mt-2 text-4xl text-foreground sm:text-5xl">
          Histórico
        </h1>
        <div className="divider-ornament mt-5 max-w-sm text-sm">✦</div>
      </header>

      <div className="mt-8 space-y-3">
        {isLoading && (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        )}

        {!isLoading && data?.length === 0 && (
          <div className="card-ornament flex flex-col items-center gap-3 p-10 text-center">
            <History className="text-flame-soft" size={32} />
            <p className="text-muted-foreground">
              Você ainda não começou nenhuma conversa.
            </p>
            <Link
              to="/"
              className="mt-2 rounded-md bg-gradient-flame px-5 py-2 text-sm font-semibold text-primary-foreground no-underline"
            >
              Contextualizar agora
            </Link>
          </div>
        )}

        {data?.map((item) => (
          <Link
            key={item.id}
            to="/historico/$id"
            params={{ id: item.id }}
            className="card-ornament flex items-center justify-between gap-4 p-5 no-underline transition hover:-translate-y-0.5"
          >
            <p className="min-w-0 truncate font-semibold text-foreground">
              {item.titulo}
            </p>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatarData(item.updatedAt)}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
