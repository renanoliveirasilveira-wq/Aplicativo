import type { AnaliseContextual } from "@/lib/schemas";

function Campo({
  rotulo,
  valor,
}: {
  rotulo: string;
  valor: string | null | undefined;
}) {
  if (!valor) return null;
  return (
    <div className="border-b border-border/60 py-3 last:border-0">
      <p className="label-caps">{rotulo}</p>
      <p className="font-serif-body mt-1 leading-relaxed text-foreground">
        {valor}
      </p>
    </div>
  );
}

function ListaSimples({ rotulo, itens }: { rotulo: string; itens: string[] }) {
  if (!itens?.length) return null;
  return (
    <div className="border-b border-border/60 py-3 last:border-0">
      <p className="label-caps">{rotulo}</p>
      <ul className="mt-2 space-y-1.5">
        {itens.map((item, i) => (
          <li
            key={i}
            className="font-serif-body flex gap-2 leading-relaxed text-foreground"
          >
            <span className="text-gold select-none">◆</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TextoVersiculos({
  versiculos,
}: {
  versiculos: { versiculo: number; texto: string }[] | null;
}) {
  if (!versiculos?.length) return null;
  return (
    <div className="mt-3 space-y-1">
      {versiculos.map((v) => (
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
  );
}

function ListaReferencias({
  rotulo,
  itens,
}: {
  rotulo: string;
  itens: { referencia: string; texto: string | null; descricao: string }[];
}) {
  if (!itens?.length) return null;
  return (
    <div className="border-b border-border/60 py-3 last:border-0">
      <p className="label-caps">{rotulo}</p>
      <ul className="mt-2 space-y-4">
        {itens.map((item, i) => (
          <li key={i} className="font-serif-body leading-relaxed">
            <p className="font-semibold text-primary">{item.referencia}</p>
            {item.texto && (
              <p className="mt-0.5 italic text-primary/90">"{item.texto}"</p>
            )}
            <p className="mt-1.5 text-foreground">{item.descricao}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ListaPadroes({
  rotulo,
  itens,
}: {
  rotulo: string;
  itens: { padrao: string; descricao: string }[];
}) {
  if (!itens?.length) return null;
  return (
    <div className="border-b border-border/60 py-3 last:border-0">
      <p className="label-caps">{rotulo}</p>
      <ul className="mt-2 space-y-3">
        {itens.map((item, i) => (
          <li key={i} className="font-serif-body leading-relaxed">
            <p className="font-semibold text-primary">{item.padrao}</p>
            <p className="mt-0.5 text-foreground">{item.descricao}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Secao({
  numero,
  titulo,
  children,
}: {
  numero: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-ornament animate-fade-rise p-6 sm:p-8">
      <header className="mb-4">
        <span className="label-caps">Passo {numero}</span>
        <h2 className="font-display text-3xl leading-tight text-primary">
          {titulo}
        </h2>
        <div className="divider-ornament mt-3 text-xs">✦</div>
      </header>
      {children}
    </section>
  );
}

export default function AnaliseResultado({
  dados,
}: {
  dados: AnaliseContextual;
}) {
  return (
    <div className="space-y-8">
      {(dados.referencia || dados.versiculos) && (
        <figure className="card-ornament animate-fade-rise p-6 sm:p-8">
          <p className="label-caps">{dados.referencia}</p>
          <TextoVersiculos versiculos={dados.versiculos} />
        </figure>
      )}

      <Secao numero="1" titulo="Contextualização do Texto">
        {(dados.passo_1_contexto.contexto_geral_do_livro ||
          dados.passo_1_contexto.contexto_literario_do_livro) && (
          <div className="mb-5 space-y-3 rounded-lg border border-[var(--chip-line)] bg-[var(--chip-bg)] p-4">
            <p className="label-caps mb-1.5">Sobre este livro</p>
            {dados.passo_1_contexto.contexto_geral_do_livro && (
              <p className="font-serif-body leading-relaxed text-foreground">
                {dados.passo_1_contexto.contexto_geral_do_livro}
              </p>
            )}
            {dados.passo_1_contexto.contexto_literario_do_livro && (
              <p className="font-serif-body leading-relaxed text-foreground">
                {dados.passo_1_contexto.contexto_literario_do_livro}
              </p>
            )}
          </div>
        )}
        <p className="label-caps mb-1">Sobre esta referência especificamente</p>
        <Campo
          rotulo="Quem escreveu"
          valor={dados.passo_1_contexto.quem_escreveu}
        />
        <Campo
          rotulo="Contexto histórico e cultural"
          valor={dados.passo_1_contexto.contexto_historico_cultural}
        />
        <Campo rotulo="Geografia" valor={dados.passo_1_contexto.geografia} />
        <Campo
          rotulo="Orientação de leitura"
          valor={dados.passo_1_contexto.orientacao_leitura}
        />
        <ListaSimples
          rotulo="Curiosidades"
          itens={dados.passo_1_contexto.curiosidades}
        />
        <Campo
          rotulo="Outras observações relevantes"
          valor={dados.passo_1_contexto.observacoes_adicionais}
        />
      </Secao>

      <Secao
        numero="2"
        titulo="Conexões Bíblicas que Facilitam o Entendimento do Texto"
      >
        <ListaReferencias
          rotulo="Referências relacionadas"
          itens={
            dados.passo_2_interpretacao_biblia_com_biblia
              .referencias_relacionadas
          }
        />
        <ListaReferencias
          rotulo="Textos paralelos"
          itens={dados.passo_2_interpretacao_biblia_com_biblia.textos_paralelos}
        />
        <ListaPadroes
          rotulo="Padrões bíblicos"
          itens={dados.passo_2_interpretacao_biblia_com_biblia.padroes_biblicos}
        />
      </Secao>

      {/* Passo 3 é sempre o mesmo texto — fixo aqui, não gerado pela IA,
          pra não gastar tokens de saída reproduzindo algo que nunca muda. */}
      <Secao numero="3" titulo="Orar e Labutar">
        <p className="font-serif-body leading-relaxed text-foreground">
          Parabéns pela decisão de estudar a Bíblia hoje. Continue labutando,
          você não está sozinho. O Espírito Santo está com você.
        </p>
        <blockquote className="font-serif-body mt-4 border-l-2 border-gold pl-4 leading-relaxed text-muted-foreground italic">
          "Mas aquele Consolador, o Espírito Santo, que o Pai enviará em meu
          nome, esse vos ensinará todas as coisas, e vos fará lembrar de
          tudo quanto vos tenho dito."
          <footer className="label-caps mt-2 not-italic">João 14:26</footer>
        </blockquote>
      </Secao>
    </div>
  );
}
