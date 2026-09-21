import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/termos')({
  head: () => ({
    meta: [{ title: 'Termos de Uso — Manual de Contextualização Bíblica' }],
  }),
  component: Termos,
})

function Secao({
  titulo,
  children,
}: {
  titulo: string
  children: React.ReactNode
}) {
  return (
    <section className="border-b border-border/60 py-5 last:border-0">
      <h2 className="font-display text-xl text-foreground">{titulo}</h2>
      <div className="font-serif-body mt-2 space-y-2 leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  )
}

function Termos() {
  return (
    <main className="page-wrap px-4 py-12 sm:py-16">
      <Link
        to="/login"
        className="text-sm font-semibold text-muted-foreground no-underline hover:text-foreground"
      >
        ← Voltar
      </Link>

      <header className="mt-6 text-center">
        <p className="label-caps">Manual de Contextualização Bíblica</p>
        <h1 className="font-display mt-2 text-4xl text-foreground sm:text-5xl">
          Termos de Uso
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Última atualização: [DATA]
        </p>
      </header>

      <div className="card-ornament mt-10 p-6 sm:p-8">
        <Secao titulo="1. O que é este aplicativo">
          <p>
            O Manual de Contextualização Bíblica é uma ferramenta de apoio ao
            curso "[NOME DO CURSO]", vendido por [NOME/RAZÃO SOCIAL DO
            RESPONSÁVEL]. Ele existe exclusivamente para ajudar quem já
            comprou o curso a estudar a Bíblia pelo método Ajuste
            Interpretativo, entregando dados de contexto histórico,
            cultural e literário sobre os textos que você pesquisar. Não tem
            nenhuma outra finalidade.
          </p>
        </Secao>

        <Secao titulo="2. Quem pode usar">
          <p>
            O acesso é individual e vinculado à compra do curso. Sua conta é
            liberada automaticamente após a confirmação da compra na
            plataforma de vendas (Eduzz). Você é responsável por manter sua
            senha em sigilo e não deve compartilhar seu acesso com terceiros
            — o acesso é pessoal e intransferível.
          </p>
        </Secao>

        <Secao titulo="3. O que a ferramenta entrega (e o que ela não faz)">
          <p>
            As respostas são geradas por inteligência artificial e trazem
            dados objetivos — contexto histórico, cultural, literário e
            conexões entre textos bíblicos. A ferramenta é construída para{' '}
            <strong>não interpretar</strong> o texto por você, não substituir
            estudo teológico, aconselhamento pastoral ou o trabalho do
            Espírito Santo na sua vida. As respostas podem conter
            imprecisões, como qualquer ferramenta de IA — use-as como ponto
            de partida para seu próprio estudo, não como palavra final.
          </p>
        </Secao>

        <Secao titulo="4. Uso aceitável">
          <p>Ao usar o aplicativo, você concorda em não:</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>Compartilhar seu login e senha com outras pessoas;</li>
            <li>
              Tentar acessar dados de outros usuários ou áreas do sistema
              não destinadas a você;
            </li>
            <li>
              Usar scripts, automações ou qualquer meio para sobrecarregar
              ou extrair dados em massa do aplicativo;
            </li>
            <li>Revender, redistribuir ou sublicenciar o acesso à ferramenta.</li>
          </ul>
        </Secao>

        <Secao titulo="5. Cancelamento e suspensão">
          <p>
            Seu acesso está associado à sua compra do curso e às políticas
            de reembolso da Eduzz. Podemos suspender ou encerrar contas que
            violem estes Termos, sem aviso prévio, em caso de uso indevido
            comprovado.
          </p>
        </Secao>

        <Secao titulo="6. Propriedade intelectual">
          <p>
            O método Ajuste Interpretativo, os textos, o design e o
            funcionamento deste aplicativo pertencem a [NOME/RAZÃO SOCIAL DO
            RESPONSÁVEL]. Você pode usar o conteúdo gerado para seu estudo
            pessoal, mas não pode reproduzi-lo comercialmente sem
            autorização.
          </p>
        </Secao>

        <Secao titulo="7. Limitação de responsabilidade">
          <p>
            O aplicativo é fornecido "como está". Fazemos o possível para
            manter o serviço disponível e as informações corretas, mas não
            garantimos disponibilidade ininterrupta nem a ausência total de
            erros nas respostas geradas por IA.
          </p>
        </Secao>

        <Secao titulo="8. Alterações nestes termos">
          <p>
            Podemos atualizar estes Termos de tempos em tempos. Mudanças
            relevantes serão comunicadas dentro do próprio aplicativo antes
            de entrarem em vigor.
          </p>
        </Secao>

        <Secao titulo="9. Dúvidas e contato">
          <p>
            Em caso de dúvidas sobre estes Termos, entre em contato pelo
            e-mail [E-MAIL DE CONTATO].
          </p>
        </Secao>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Veja também nossa{' '}
        <Link to="/privacidade">Política de Privacidade</Link>.
      </p>
    </main>
  )
}
