import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import {
  atualizarPlanoAluno,
  bloquearAluno,
  criarAlunoManual,
  definirSenhaAluno,
  desbloquearAluno,
  excluirAlunoPermanentemente,
  listarAlunos,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_app/admin")({
  beforeLoad: ({ context }) => {
    const role = (context.user as unknown as { role?: string | null }).role;
    if (role !== "admin") {
      throw redirect({ to: "/" });
    }
  },
  head: () => ({
    meta: [{ title: "Painel Admin — Manual de Contextualização Bíblica" }],
  }),
  component: AdminPainel,
});

type Aluno = Awaited<ReturnType<typeof listarAlunos>>[number];

function formatarData(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

function paraInputDate(iso: string) {
  // Mesmo fuso (America/Sao_Paulo) usado em formatarData, pra não ficar
  // mostrando um dia diferente entre a tabela e o campo de edição.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function NovoAlunoForm({ onCriado }: { onCriado: () => void }) {
  const criarFn = useServerFn(criarAlunoManual);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [plano, setPlano] = useState<"anual" | "semestral">("anual");
  const [aberto, setAberto] = useState(false);

  const mutation = useMutation({
    mutationFn: () => criarFn({ data: { nome, email, senha, plano } }),
    onSuccess: () => {
      setNome("");
      setEmail("");
      setSenha("");
      setPlano("anual");
      setAberto(false);
      onCriado();
    },
  });

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-md bg-gradient-flame px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        + Adicionar aluno manualmente
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="card-ornament grid gap-3 p-5 sm:grid-cols-2 sm:p-6"
    >
      <div>
        <label className="label-caps">Nome</label>
        <input
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="label-caps">E-mail</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="label-caps">Senha provisória</label>
        <input
          required
          type="text"
          minLength={8}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="mín. 8 caracteres"
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="label-caps">Plano</label>
        <select
          value={plano}
          onChange={(e) => setPlano(e.target.value as "anual" | "semestral")}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="anual">Anual</option>
          <option value="semestral">Semestral</option>
        </select>
      </div>

      {mutation.isError && (
        <p className="text-sm text-destructive sm:col-span-2">
          {mutation.error?.message || "Não foi possível criar o aluno."}
        </p>
      )}

      <div className="flex gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-gradient-flame px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? "Criando…" : "Criar aluno"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded-md border border-input px-5 py-2 text-sm font-semibold text-muted-foreground"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function LinhaAluno({ aluno, onMudou }: { aluno: Aluno; onMudou: () => void }) {
  const [editando, setEditando] = useState(false);
  const [plano, setPlano] = useState(aluno.plano);
  const [inicio, setInicio] = useState(paraInputDate(aluno.assinaturaInicioEm));
  const [ajuste, setAjuste] = useState(String(aluno.creditoAjusteUsd));
  const [novaSenha, setNovaSenha] = useState("");

  const atualizarFn = useServerFn(atualizarPlanoAluno);
  const bloquearFn = useServerFn(bloquearAluno);
  const desbloquearFn = useServerFn(desbloquearAluno);
  const excluirFn = useServerFn(excluirAlunoPermanentemente);
  const definirSenhaFn = useServerFn(definirSenhaAluno);

  const salvar = useMutation({
    mutationFn: () =>
      atualizarFn({
        data: {
          userId: aluno.id,
          plano,
          // Brasil não observa horário de verão desde 2019, então "-03:00"
          // fixo corresponde sempre à meia-noite local (America/Sao_Paulo).
          assinaturaInicioEm: new Date(`${inicio}T00:00:00-03:00`).toISOString(),
          creditoAjusteUsd: Number(ajuste) || 0,
        },
      }),
    onSuccess: () => {
      setEditando(false);
      onMudou();
    },
  });

  const bloquear = useMutation({
    mutationFn: () => bloquearFn({ data: { userId: aluno.id } }),
    onSuccess: onMudou,
  });

  const desbloquear = useMutation({
    mutationFn: () => desbloquearFn({ data: { userId: aluno.id } }),
    onSuccess: onMudou,
  });

  const excluir = useMutation({
    mutationFn: () => excluirFn({ data: { userId: aluno.id } }),
    onSuccess: onMudou,
  });

  const definirSenha = useMutation({
    mutationFn: () => definirSenhaFn({ data: { userId: aluno.id, novaSenha } }),
    onSuccess: () => setNovaSenha(""),
  });

  function confirmarExclusao() {
    if (
      window.confirm(
        `Excluir permanentemente ${aluno.nome} (${aluno.email})? Isso apaga a conta e todo o histórico de conversas, sem volta.`,
      )
    ) {
      excluir.mutate();
    }
  }

  return (
    <>
      <tr className="border-b border-[var(--line)]">
        <td className="py-3 pr-3">
          <p className="font-semibold text-foreground">{aluno.nome}</p>
          <p className="text-xs text-muted-foreground">{aluno.email}</p>
        </td>
        <td className="py-3 pr-3 text-sm text-foreground">
          {aluno.plano === "anual" ? "Anual" : "Semestral"}
        </td>
        <td className="py-3 pr-3 text-sm text-muted-foreground">
          {formatarData(aluno.assinaturaInicioEm)}
        </td>
        <td className="py-3 pr-3">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full ${
                aluno.percentualUsado >= 100 ? "bg-destructive" : "bg-gradient-flame"
              }`}
              style={{ width: `${Math.min(100, aluno.percentualUsado)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {aluno.percentualUsado}% (${aluno.usoAcumuladoUsd.toFixed(4)} / $
            {aluno.orcamentoAcumuladoUsd.toFixed(4)})
          </p>
        </td>
        <td className="py-3 pr-3">
          {aluno.bloqueado ? (
            <span className="rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-semibold text-destructive">
              Bloqueado
            </span>
          ) : (
            <span className="rounded-full bg-flame-soft/15 px-2.5 py-1 text-xs font-semibold text-flame-soft">
              Ativo
            </span>
          )}
          {aluno.role === "admin" && (
            <span className="ml-1 rounded-full border border-[var(--chip-line)] px-2.5 py-1 text-xs text-muted-foreground">
              admin
            </span>
          )}
        </td>
        <td className="py-3 text-right">
          <div className="flex flex-wrap justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setEditando((v) => !v)}
              className="rounded-md border border-input px-2.5 py-1 text-xs font-medium text-foreground"
            >
              Editar
            </button>
            {aluno.bloqueado ? (
              <button
                type="button"
                onClick={() => desbloquear.mutate()}
                disabled={desbloquear.isPending}
                className="rounded-md border border-input px-2.5 py-1 text-xs font-medium text-foreground disabled:opacity-50"
              >
                Desbloquear
              </button>
            ) : (
              <button
                type="button"
                onClick={() => bloquear.mutate()}
                disabled={bloquear.isPending || aluno.role === "admin"}
                className="rounded-md border border-input px-2.5 py-1 text-xs font-medium text-foreground disabled:opacity-50"
              >
                Bloquear
              </button>
            )}
            <button
              type="button"
              onClick={confirmarExclusao}
              disabled={excluir.isPending || aluno.role === "admin"}
              className="rounded-md border border-destructive/40 px-2.5 py-1 text-xs font-medium text-destructive disabled:opacity-50"
            >
              Excluir
            </button>
          </div>
        </td>
      </tr>
      {editando && (
        <tr className="border-b border-[var(--line)] bg-[var(--chip-bg)]">
          <td colSpan={6} className="p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="label-caps">Plano</label>
                <select
                  value={plano}
                  onChange={(e) => setPlano(e.target.value as "anual" | "semestral")}
                  className="mt-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none"
                >
                  <option value="anual">Anual</option>
                  <option value="semestral">Semestral</option>
                </select>
              </div>
              <div>
                <label className="label-caps">Início da assinatura</label>
                <input
                  type="date"
                  value={inicio}
                  onChange={(e) => setInicio(e.target.value)}
                  className="mt-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none"
                />
              </div>
              <div>
                <label className="label-caps">Ajuste manual de crédito (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={ajuste}
                  onChange={(e) => setAjuste(e.target.value)}
                  className="mt-1 w-32 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => salvar.mutate()}
                disabled={salvar.isPending}
                className="rounded-md bg-gradient-flame px-4 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {salvar.isPending ? "Salvando…" : "Salvar"}
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Empurrar o início da assinatura pra trás dá mais crédito acumulado na
              hora; o ajuste manual soma (ou subtrai, se negativo) direto no crédito
              disponível.
            </p>

            <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-[var(--line)] pt-4">
              <div>
                <label className="label-caps">Definir nova senha</label>
                <input
                  type="text"
                  minLength={8}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="mín. 8 caracteres"
                  className="mt-1 w-48 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => definirSenha.mutate()}
                disabled={definirSenha.isPending || novaSenha.length < 8}
                className="rounded-md border border-input px-4 py-1.5 text-sm font-semibold text-foreground disabled:opacity-50"
              >
                {definirSenha.isPending ? "Salvando…" : "Definir senha"}
              </button>
              {definirSenha.isSuccess && (
                <p className="text-xs text-flame-soft">Senha alterada.</p>
              )}
              {definirSenha.isError && (
                <p className="text-xs text-destructive">
                  {definirSenha.error?.message || "Não foi possível alterar a senha."}
                </p>
              )}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Isso troca a senha direto, sem precisar da senha atual do aluno — avise
              ele por fora (WhatsApp, e-mail) qual é a senha nova.
            </p>
          </td>
        </tr>
      )}
    </>
  );
}

function AdminPainel() {
  const listarFn = useServerFn(listarAlunos);
  const queryClient = useQueryClient();

  const alunosQuery = useQuery({
    queryKey: ["admin-alunos"],
    queryFn: () => listarFn(),
  });

  function recarregar() {
    queryClient.invalidateQueries({ queryKey: ["admin-alunos"] });
  }

  const alunos = alunosQuery.data ?? [];
  const total = alunos.length;
  const ativos = alunos.filter((a) => !a.bloqueado).length;
  const bloqueados = alunos.filter((a) => a.bloqueado).length;
  const proximosDoLimite = alunos.filter(
    (a) => !a.bloqueado && a.percentualUsado >= 80,
  ).length;

  return (
    <main className="page-wrap px-4 py-12 sm:py-16">
      <header>
        <p className="label-caps">Administração</p>
        <h1 className="font-display mt-2 text-4xl text-foreground sm:text-5xl">
          Painel de alunos
        </h1>
        <div className="divider-ornament mt-5 max-w-sm text-sm">✦</div>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { rotulo: "Alunos", valor: total },
          { rotulo: "Ativos", valor: ativos },
          { rotulo: "Bloqueados", valor: bloqueados },
          { rotulo: "Perto do limite", valor: proximosDoLimite },
        ].map((item) => (
          <div key={item.rotulo} className="card-ornament p-4">
            <p className="label-caps">{item.rotulo}</p>
            <p className="font-display mt-1 text-3xl text-foreground">{item.valor}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <NovoAlunoForm onCriado={recarregar} />
      </div>

      <div className="card-ornament mt-6 overflow-x-auto p-5 sm:p-6">
        {alunosQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-[var(--line)] text-xs text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Aluno</th>
                <th className="pb-2 pr-3 font-medium">Plano</th>
                <th className="pb-2 pr-3 font-medium">Início</th>
                <th className="pb-2 pr-3 font-medium">Crédito usado</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((aluno) => (
                <LinhaAluno key={aluno.id} aluno={aluno} onMudou={recarregar} />
              ))}
            </tbody>
          </table>
        )}
        {!alunosQuery.isLoading && alunos.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum aluno cadastrado ainda.
          </p>
        )}
      </div>
    </main>
  );
}
