import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/sobre')({
  head: () => ({
    meta: [{ title: 'Sobre o Método — Manual de Contextualização Bíblica' }],
  }),
  component: Sobre,
})

const movimentos = [
  {
    numero: '1',
    titulo: 'Apropriar-se do contexto',
    texto:
      'A Bíblia reúne histórias de milhares de anos atrás. Para interpretar corretamente um texto é preciso entender a cultura, a história e os costumes da época em que foi escrito: para quem foi escrito, quem o recebeu, qual era a intenção do autor e qual o gênero literário — histórico, poético, epistolar, profético — para então perceber o que ele significa para nós hoje.',
  },
  {
    numero: '2',
    titulo: 'A Bíblia se autointerpreta',
    texto:
      'A própria Escritura explica a si mesma: textos mais simples e claros ajudam a explicar os textos mais complexos. Esse movimento busca referências, paralelos e padrões bíblicos que iluminam o texto em estudo a partir do restante das Escrituras.',
  },
  {
    numero: '3',
    titulo: 'Orar e labutar',
    texto:
      'Um movimento espiritual: enquanto oramos e buscamos o Espírito Santo, Ele vai iluminando e revelando cada vez mais o texto sagrado — e, ao mesmo tempo, seguimos estudando e aprendendo mais sobre a Palavra e o seu contexto.',
  },
]

function Sobre() {
  return (
    <main className="page-wrap px-4 pb-16 pt-14">
      <section className="card-ornament rise-in relative overflow-hidden px-6 py-10 sm:px-10 sm:py-14">
        <p className="label-caps mb-3">O Método</p>
        <h1 className="font-display mb-5 max-w-3xl text-4xl leading-[1.05] font-bold text-foreground sm:text-5xl">
          Ajuste Interpretativo
        </h1>
        <p className="font-serif-body max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Um método de estudo bíblico construído em três movimentos, para que
          cada leitor se aproxime da Palavra com contexto, com a própria
          Escritura como intérprete e com o coração dependente do Espírito
          Santo.
        </p>
      </section>

      <section className="mt-8 space-y-6">
        {movimentos.map((m) => (
          <article key={m.numero} className="card-ornament rise-in p-6 sm:p-8">
            <div className="flex items-start gap-4 sm:gap-6">
              <span className="font-display shrink-0 text-4xl font-semibold text-gold sm:text-5xl">
                {m.numero}
              </span>
              <div>
                <h2 className="font-display text-2xl leading-tight text-foreground sm:text-3xl">
                  {m.titulo}
                </h2>
                <p className="font-serif-body mt-3 leading-relaxed text-foreground/90">
                  {m.texto}
                </p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="card-ornament mt-8 p-6 text-center sm:p-8">
        <p className="font-serif-body text-lg leading-relaxed text-foreground">
          Pronto para aplicar o método a um texto?
        </p>
        <a
          href="/"
          className="mt-4 inline-block rounded-md bg-primary px-6 py-2.5 font-medium tracking-wide text-primary-foreground no-underline transition-opacity hover:opacity-90"
        >
          Contextualizar um texto
        </a>
      </section>
    </main>
  )
}
