import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import Chat from "@/components/Chat";

export const Route = createFileRoute("/_app/historico/$id")({
  component: HistoricoDetalhe,
});

function HistoricoDetalhe() {
  const { id } = Route.useParams();

  return (
    <div className="page-wrap px-4 pt-8">
      <Link
        to="/historico"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground no-underline hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Voltar ao histórico
      </Link>
      <Chat conversaIdInicial={id} />
    </div>
  );
}
