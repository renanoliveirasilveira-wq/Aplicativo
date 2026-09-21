import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_app/perfil")({
  head: () => ({
    meta: [{ title: "Perfil — Manual de Contextualização Bíblica" }],
  }),
  component: Perfil,
});

function iniciais(nome: string) {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

function Perfil() {
  const { user } = Route.useRouteContext();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function alterarSenha(e: React.FormEvent) {
    e.preventDefault();
    setMensagem("");
    setErro("");
    setCarregando(true);

    const resultado = await authClient.changePassword({
      currentPassword: senhaAtual,
      newPassword: novaSenha,
      revokeOtherSessions: true,
    });

    setCarregando(false);

    if (resultado.error) {
      setErro(resultado.error.message ?? "Não foi possível alterar a senha.");
      return;
    }

    setMensagem("Senha alterada com sucesso.");
    setSenhaAtual("");
    setNovaSenha("");
  }

  const status =
    (user as { status?: string }).status === "active" ? "Ativo" : "Pendente";

  return (
    <main className="page-wrap px-4 py-12 sm:py-16">
      <header>
        <p className="label-caps">Sua conta</p>
        <h1 className="font-display mt-2 text-4xl text-foreground sm:text-5xl">
          Perfil
        </h1>
        <div className="divider-ornament mt-5 max-w-sm text-sm">✦</div>
      </header>

      <section className="card-ornament mt-8 flex items-center gap-4 p-6 sm:p-8">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-flame text-lg font-bold text-primary-foreground">
          {iniciais(user.name || user.email)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-foreground">
            {user.name}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {user.email}
          </p>
        </div>
        <span className="ml-auto shrink-0 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1 text-xs font-semibold text-flame-soft">
          {status}
        </span>
      </section>

      <section className="card-ornament mt-6 p-6 sm:p-8">
        <h2 className="font-display text-xl text-foreground">Alterar senha</h2>
        <form onSubmit={alterarSenha} className="mt-4 max-w-sm space-y-3">
          <div>
            <label htmlFor="senhaAtual" className="label-caps">
              Senha atual
            </label>
            <input
              id="senhaAtual"
              type="password"
              required
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="novaSenha" className="label-caps">
              Nova senha
            </label>
            <input
              id="novaSenha"
              type="password"
              required
              minLength={8}
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}
          {mensagem && <p className="text-sm text-flame-soft">{mensagem}</p>}

          <button
            type="submit"
            disabled={carregando}
            className="rounded-md bg-gradient-flame px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {carregando ? "Salvando…" : "Salvar nova senha"}
          </button>
        </form>
      </section>
    </main>
  );
}
