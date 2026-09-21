import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Info, Loader2, Mic, Square, X } from "lucide-react";

import AnaliseResultado from "@/components/AnaliseResultado";
import {
  buscarConversa,
  enviarMensagem,
  obterUsoDiario,
} from "@/lib/chat.functions";
import type { RespostaChat } from "@/lib/schemas";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

function criarReconhecimentoDeVoz(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;
  if (!Ctor) return null;
  const instancia: SpeechRecognitionLike = new Ctor();
  instancia.lang = "pt-BR";
  // Contínuo e com resultados parciais: a captura não para sozinha ao
  // detectar silêncio — só quando o usuário mandar parar (botão do
  // microfone) ou enviar a mensagem.
  instancia.continuous = true;
  instancia.interimResults = true;
  return instancia;
}

type Turno =
  | { id: string; role: "user"; conteudo: { texto: string } }
  | { id: string; role: "assistant"; conteudo: RespostaChat };

const exemplos = ["Salmo 23", "João 1:1-14", "Romanos 8:28", "Filipenses 4:6-7"];

function MensagemUsuario({ texto }: { texto: string }) {
  return (
    <div className="ml-auto max-w-2xl animate-fade-rise rounded-2xl rounded-tr-sm bg-gradient-flame px-5 py-3">
      <p className="font-serif-body leading-relaxed text-primary-foreground">
        {texto}
      </p>
    </div>
  );
}

function diasAteProximoCiclo(proximoCicloEm: string | null): number | null {
  if (!proximoCicloEm) return null;
  const diffMs = new Date(proximoCicloEm).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

function formatarResetoCredito(proximoCicloEm: string | null) {
  const dias = diasAteProximoCiclo(proximoCicloEm);
  if (dias === null) return "todo o crédito do plano já foi liberado";
  if (dias === 0) return "esse crédito reseta ainda hoje";
  return `esse crédito reseta em ${dias} dia${dias === 1 ? "" : "s"}`;
}

// Erros de rede crus (a conexão cair no meio do caminho, sem nem chegar a
// mandar uma resposta) chegam aqui com mensagens técnicas do navegador,
// tipo "Failed to fetch" — a pessoa nunca deveria ver isso. Troca por algo
// tranquilo; mensagens que já vêm do nosso próprio servidor (ex.: "Nossos
// canais de resposta estão cheios...") continuam passando direto, sem troca.
function mensagemDeErroAmigavel(mensagem: string | undefined): string {
  if (!mensagem) return "Não foi possível concluir a consulta. Tente novamente.";
  const pareceErroDeRede = /failed to fetch|network ?error|fetch failed|load failed/i.test(
    mensagem,
  );
  if (pareceErroDeRede) {
    return "A conexão caiu no meio do caminho. Tenta de novo em instantes.";
  }
  return mensagem;
}

function BarraDeUso({
  uso,
}: {
  uso: { percentual: number; atingiuLimite: boolean; proximoCicloEm: string | null } | undefined;
}) {
  if (!uso) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="label-caps">Crédito mensal disponível</span>
        <span>
          {uso.percentual}% usado / {formatarResetoCredito(uso.proximoCicloEm)}
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-all ${
            uso.atingiuLimite ? "bg-gold" : "bg-gradient-flame"
          }`}
          style={{ width: `${uso.percentual}%` }}
        />
      </div>
    </div>
  )
}

function RespostaEspecificaCard({
  resposta,
}: {
  resposta: Extract<RespostaChat, { tipo: "resposta_especifica" }>;
}) {
  return (
    <div className="card-ornament animate-fade-rise max-w-2xl p-5 sm:p-6">
      {resposta.referencia && (
        <p className="label-caps mb-2">{resposta.referencia}</p>
      )}
      {resposta.versiculosReferencia && resposta.versiculosReferencia.length > 0 && (
        <div className="mb-3 space-y-1 border-l-2 border-gold pl-4">
          {resposta.versiculosReferencia.map((v) => (
            <p
              key={v.versiculo}
              className="font-serif-body text-sm leading-relaxed text-muted-foreground"
            >
              <span className="mr-1.5 text-xs font-semibold text-primary">
                {v.versiculo}
              </span>
              {v.texto}
            </p>
          ))}
        </div>
      )}
      <p className="font-serif-body whitespace-pre-line leading-relaxed text-foreground">
        {resposta.resposta}
      </p>
    </div>
  );
}

function ForaDeEscopoCard({
  resposta,
}: {
  resposta: Extract<RespostaChat, { tipo: "fora_do_escopo" }>;
}) {
  return (
    <div className="card-ornament animate-fade-rise max-w-2xl p-5 sm:p-6">
      <p className="font-serif-body whitespace-pre-line leading-relaxed text-foreground">
        {resposta.mensagem}
      </p>
    </div>
  );
}

function ReferenciaNaoReconhecidaCard({
  resposta,
  onUsarSugestao,
}: {
  resposta: Extract<RespostaChat, { tipo: "referencia_nao_reconhecida" }>;
  onUsarSugestao: (texto: string) => void;
}) {
  return (
    <div className="card-ornament animate-fade-rise max-w-2xl p-5 sm:p-6">
      <p className="font-serif-body whitespace-pre-line leading-relaxed text-foreground">
        {resposta.mensagem}
      </p>
      {resposta.sugestao && (
        <button
          type="button"
          onClick={() => onUsarSugestao(resposta.sugestao!)}
          className="mt-3 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-4 py-1.5 text-sm font-medium text-foreground transition hover:bg-gradient-flame hover:text-primary-foreground"
        >
          Usar "{resposta.sugestao}"
        </button>
      )}
    </div>
  );
}

export default function Chat({
  conversaIdInicial,
}: {
  conversaIdInicial?: string;
}) {
  const [conversaId, setConversaId] = useState<string | null>(
    conversaIdInicial ?? null,
  );
  const [mensagens, setMensagens] = useState<Turno[]>([]);
  const [texto, setTexto] = useState("");
  const [gravando, setGravando] = useState(false);
  const [vozDisponivel, setVozDisponivel] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);
  const reconhecimentoRef = useRef<SpeechRecognitionLike | null>(null);
  const gravandoRef = useRef(false);
  const textoBaseRef = useRef("");
  const transcricaoFinalRef = useRef("");

  useEffect(() => {
    setVozDisponivel(criarReconhecimentoDeVoz() !== null);
  }, []);

  function pararGravacao() {
    gravandoRef.current = false;
    setGravando(false);
    reconhecimentoRef.current?.stop();
    reconhecimentoRef.current = null;
  }

  function iniciarGravacao() {
    const reconhecimento = criarReconhecimentoDeVoz();
    if (!reconhecimento) return;

    textoBaseRef.current = texto.trim();
    transcricaoFinalRef.current = "";

    reconhecimento.onresult = (event) => {
      let parcial = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const resultado = event.results[i];
        const trecho: string = resultado[0]?.transcript ?? "";
        if (resultado.isFinal) {
          transcricaoFinalRef.current += trecho + " ";
        } else {
          parcial += trecho;
        }
      }
      const falado = (transcricaoFinalRef.current + parcial).trim();
      setTexto([textoBaseRef.current, falado].filter(Boolean).join(" "));
    };

    reconhecimento.onerror = (event) => {
      // "no-speech"/"aborted" são transitórios em modo contínuo — o
      // microfone deve continuar ativo até o usuário parar ou enviar.
      if (event?.error === "not-allowed" || event?.error === "audio-capture") {
        pararGravacao();
      }
    };

    reconhecimento.onend = () => {
      // O navegador pode encerrar sozinho (limite de tempo, silêncio
      // prolongado). Se o usuário ainda não pediu pra parar, reinicia.
      if (gravandoRef.current) {
        try {
          reconhecimento.start();
        } catch {
          // já iniciado ou indisponível; ignora
        }
      }
    };

    reconhecimentoRef.current = reconhecimento;
    gravandoRef.current = true;
    setGravando(true);
    reconhecimento.start();
  }

  function alternarGravacao() {
    if (gravando) {
      pararGravacao();
    } else {
      iniciarGravacao();
    }
  }

  function limparTexto() {
    setTexto("");
    textoBaseRef.current = "";
    transcricaoFinalRef.current = "";
  }

  useEffect(() => {
    return () => {
      gravandoRef.current = false;
      reconhecimentoRef.current?.stop();
    };
  }, []);

  const enviarFn = useServerFn(enviarMensagem);
  const buscarFn = useServerFn(buscarConversa);
  const usoFn = useServerFn(obterUsoDiario);
  const queryClient = useQueryClient();

  const conversaQuery = useQuery({
    queryKey: ["conversa", conversaIdInicial],
    queryFn: () => buscarFn({ data: { id: conversaIdInicial! } }),
    enabled: !!conversaIdInicial,
  });

  const usoQuery = useQuery({
    queryKey: ["uso-diario"],
    queryFn: () => usoFn(),
  });

  useEffect(() => {
    if (conversaQuery.data) {
      setMensagens(conversaQuery.data.mensagens as Turno[]);
    }
  }, [conversaQuery.data]);

  const [avisoCredito, setAvisoCredito] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (t: string) => enviarFn({ data: { conversaId, texto: t } }),
    onSuccess: (resultado, t) => {
      setConversaId(resultado.conversaId);
      setMensagens((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", conteudo: { texto: t } },
        {
          id: crypto.randomUUID(),
          role: "assistant",
          conteudo: resultado.resposta,
        },
      ]);
      setAvisoCredito(resultado.aviso ?? null);
      queryClient.invalidateQueries({ queryKey: ["uso-diario"] });
      // Mantém a pré-visualização de conversas recentes na barra lateral
      // em dia (aparece uma conversa nova ou reordena pela mais recente).
      queryClient.invalidateQueries({ queryKey: ["conversas"] });
    },
  });

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens.length, mutation.isPending]);

  // Enquanto a resposta está sendo gerada, o campo fica travado — sem
  // isso, o cursor continua piscando e parece que nada está acontecendo.
  // Atingir o crédito mensal NÃO bloqueia mais o campo — a ferramenta
  // continua funcionando pela fila gratuita nesse caso (ver
  // enviarMensagem em chat.functions.ts), só fica mais lenta.
  const entradaBloqueada = mutation.isPending;

  function enviar() {
    const valor = texto.trim();
    if (valor.length < 3 || mutation.isPending) return;
    if (gravandoRef.current) pararGravacao();
    setAvisoCredito(null);
    mutation.mutate(valor);
    setTexto("");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    enviar();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  }

  const vazio = mensagens.length === 0 && !conversaQuery.isLoading;

  return (
    <main className="page-wrap px-4 py-12 sm:py-16">
      <header className="text-center">
        <p className="label-caps">Método Ajuste Interpretativo</p>
        <h1 className="font-display mt-2 text-5xl leading-none text-foreground sm:text-6xl">
          Contextualize um <span className="text-gradient-flame">texto</span>
        </h1>
        <div className="divider-ornament mx-auto mt-5 max-w-sm text-sm">✦</div>
        <p className="font-serif-body mx-auto mt-4 max-w-xl text-muted-foreground">
          Informe uma referência para uma análise completa, ou faça uma
          pergunta pontual sobre o texto. Este sistema não fornece
          interpretação, apenas dados para análise contextual.
        </p>
      </header>

      <div className="mt-10 space-y-6">
        {conversaQuery.isLoading && (
          <p className="text-center text-sm text-muted-foreground">
            Carregando conversa…
          </p>
        )}

        {mensagens.map((turno) =>
          turno.role === "user" ? (
            <MensagemUsuario key={turno.id} texto={turno.conteudo.texto} />
          ) : turno.conteudo.tipo === "analise_completa" ? (
            <AnaliseResultado key={turno.id} dados={turno.conteudo.dados} />
          ) : turno.conteudo.tipo === "fora_do_escopo" ? (
            <ForaDeEscopoCard key={turno.id} resposta={turno.conteudo} />
          ) : turno.conteudo.tipo === "referencia_nao_reconhecida" ? (
            <ReferenciaNaoReconhecidaCard
              key={turno.id}
              resposta={turno.conteudo}
              onUsarSugestao={setTexto}
            />
          ) : (
            <RespostaEspecificaCard key={turno.id} resposta={turno.conteudo} />
          ),
        )}

        {mutation.isError && (
          <p className="card-ornament p-4 text-center text-destructive">
            {mensagemDeErroAmigavel(mutation.error?.message)}
          </p>
        )}
        {avisoCredito && !mutation.isPending && (
          <p className="card-ornament flex items-start gap-1.5 p-4 text-sm text-muted-foreground">
            <Info size={14} className="mt-0.5 shrink-0 text-gold" />
            {avisoCredito}
          </p>
        )}
      </div>

      <form
        onSubmit={onSubmit}
        className={`card-ornament p-5 sm:p-6 ${vazio ? "mt-10" : "mt-6"}`}
      >
        <BarraDeUso uso={usoQuery.data} />
        <label htmlFor="texto" className="label-caps">
          {mutation.isPending
            ? "Gerando resposta…"
            : vazio
              ? "Texto bíblico ou pergunta"
              : "Continue a conversa"}
        </label>
        <div className="relative mt-2">
          <textarea
            id="texto"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            disabled={entradaBloqueada}
            placeholder={
              mutation.isPending
                ? "Aguardando a resposta…"
                : gravando
                  ? "Ouvindo… fale sua pergunta"
                  : vazio
                    ? "Ex.: Salmo 23, João 1:1-14, ou uma pergunta como 'quem era Nicodemos?'"
                    : "Digite outra referência que você tenha interesse em receber o contexto…"
            }
            className="font-serif-body w-full resize-y rounded-md border border-input bg-background px-4 py-3 pr-24 text-lg outline-none transition-shadow placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          />
          <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
            {!entradaBloqueada && texto.length > 0 && (
              <button
                type="button"
                onClick={limparTexto}
                aria-label="Limpar texto"
                title="Limpar texto"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--chip-bg)] text-muted-foreground transition hover:text-foreground"
              >
                <X size={18} />
              </button>
            )}
            {!entradaBloqueada && vozDisponivel && (
              <button
                type="button"
                onClick={alternarGravacao}
                aria-label={
                  gravando ? "Parar gravação" : "Falar pergunta por voz"
                }
                title={gravando ? "Parar gravação" : "Falar pergunta por voz"}
                className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                  gravando
                    ? "animate-pulse bg-destructive text-destructive-foreground"
                    : "bg-[var(--chip-bg)] text-muted-foreground hover:text-foreground"
                }`}
              >
                {gravando ? <Square size={16} /> : <Mic size={18} />}
              </button>
            )}
          </div>
        </div>
        {gravando && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
            Ouvindo — o microfone continua ativo até você enviar ou parar
          </p>
        )}
        {vazio && (
          <div className="mt-3 flex flex-wrap gap-2">
            {exemplos.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setTexto(ex)}
                className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
              >
                {ex}
              </button>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Enter para enviar · Shift+Enter para pular linha
          </p>
          <button
            type="submit"
            disabled={mutation.isPending || texto.trim().length < 3}
            className="inline-flex items-center gap-2 rounded-md bg-gradient-flame px-6 py-2.5 font-semibold tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
            {mutation.isPending ? "Consultando…" : "Enviar"}
          </button>
        </div>
      </form>

      {mutation.isPending && (
        <div className="card-ornament animate-fade-rise mt-6 flex items-center gap-3 p-4">
          <Loader2
            size={20}
            className="animate-spin shrink-0 text-flame-soft"
          />
          <p className="text-sm text-muted-foreground">
            Aguarde, estamos separando as informações importantes dessa
            referência pra você — isso pode levar até um minuto.
          </p>
        </div>
      )}

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground/70">
        <Info size={13} className="shrink-0" />
        As respostas partem de uma base de dados pesquisada previamente
        sobre o contexto bíblico, mas como envolvem inteligência artificial
        na entrega, podem conter alguma imprecisão — vale sempre conferir.
      </p>

      <div ref={fimRef} />
    </main>
  );
}
