import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/privacidade')({
  head: () => ({
    meta: [
      { title: 'Política de Privacidade — Manual de Contextualização Bíblica' },
    ],
  }),
  component: Privacidade,
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

function Privacidade() {
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
          Política de Privacidade
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Última atualização: [DATA]
        </p>
      </header>

      <div className="card-ornament mt-10 p-6 sm:p-8">
        <Secao titulo="1. Quem trata seus dados">
          <p>
            [NOME/RAZÃO SOCIAL DO RESPONSÁVEL], [CNPJ/CPF], é quem decide
            como e por que seus dados pessoais são tratados neste
            aplicativo ("controlador", nos termos da Lei Geral de Proteção
            de Dados — LGPD). Para falar sobre seus dados, use o contato em
            [E-MAIL DE CONTATO].
          </p>
        </Secao>

        <Secao titulo="2. Quais dados coletamos">
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <strong>Dados de cadastro:</strong> nome e e-mail, usados para
              criar e proteger sua conta. Sua senha é armazenada de forma
              criptografada — nem nós temos acesso a ela em texto puro.
            </li>
            <li>
              <strong>Dados de compra:</strong> quando o acesso for
              vinculado à Eduzz, recebemos um identificador da sua
              transação para confirmar que você é um aluno do curso.
            </li>
            <li>
              <strong>Conteúdo que você envia:</strong> os textos e
              perguntas que você digita para contextualizar, e o histórico
              das suas conversas dentro do app, para você poder consultá-las
              depois.
            </li>
            <li>
              <strong>Dados técnicos:</strong> informações básicas de
              acesso (como data/hora de uso) para segurança e prevenção de
              abuso.
            </li>
          </ul>
          <p>
            Não coletamos dados sensíveis (saúde, biometria, etc.) nem
            usamos cookies de rastreamento ou publicidade — só um cookie
            estritamente necessário para manter você conectado.
          </p>
        </Secao>

        <Secao titulo="3. Para que usamos seus dados">
          <ul className="ml-5 list-disc space-y-1">
            <li>Criar, autenticar e proteger sua conta;</li>
            <li>
              Entregar o serviço — gerar as análises contextuais que você
              solicita;
            </li>
            <li>Guardar seu histórico de conversas para você consultar depois;</li>
            <li>Confirmar que seu acesso está vinculado a uma compra válida do curso;</li>
            <li>Prevenir fraude, abuso e uso indevido do sistema.</li>
          </ul>
          <p>Não usamos seus dados para publicidade, nem vendemos seus dados a terceiros.</p>
        </Secao>

        <Secao titulo="4. Com quem compartilhamos">
          <p>
            Para gerar as respostas, o texto que você envia é processado
            pela API da Anthropic (empresa responsável pelo modelo de IA
            Claude), que atua como nossa operadora de dados — o texto pode
            ser processado em servidores fora do Brasil, sob os
            compromissos de proteção de dados da própria Anthropic. Também
            trabalhamos com a Eduzz para validar sua compra e liberar seu
            acesso. Não compartilhamos seus dados com mais ninguém, exceto
            se exigido por lei.
          </p>
        </Secao>

        <Secao titulo="5. Por quanto tempo guardamos seus dados">
          <p>
            Mantemos seus dados enquanto sua conta estiver ativa. Se você
            pedir a exclusão da sua conta, apagamos seus dados pessoais e
            seu histórico, exceto o que formos obrigados a manter por lei
            (por exemplo, registros fiscais da compra, guardados pela
            Eduzz).
          </p>
        </Secao>

        <Secao titulo="6. Seus direitos">
          <p>De acordo com a LGPD, você pode a qualquer momento:</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>Confirmar se tratamos dados seus e pedir acesso a eles;</li>
            <li>Corrigir dados incompletos, incorretos ou desatualizados;</li>
            <li>
              Pedir a exclusão ou anonimização dos seus dados, ou a
              portabilidade deles para outro serviço;
            </li>
            <li>Saber com quem compartilhamos seus dados;</li>
            <li>Revogar seu consentimento e se opor a tratamentos indevidos.</li>
          </ul>
          <p>
            Para exercer qualquer um desses direitos, escreva para
            [E-MAIL DE CONTATO].
          </p>
        </Secao>

        <Secao titulo="7. Segurança">
          <p>
            Sua senha é armazenada com hash criptográfico (nunca em texto
            puro), a conexão com o aplicativo deve ser feita sempre por
            HTTPS, e limitamos automaticamente tentativas repetidas de
            login para dificultar ataques. Nenhum sistema é 100% imune a
            incidentes, mas trabalhamos para manter suas informações
            protegidas e revisamos essas medidas periodicamente.
          </p>
        </Secao>

        <Secao titulo="8. Alterações nesta política">
          <p>
            Podemos atualizar esta Política periodicamente. Mudanças
            relevantes serão avisadas dentro do aplicativo antes de
            entrarem em vigor.
          </p>
        </Secao>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Veja também nossos <Link to="/termos">Termos de Uso</Link>.
      </p>
    </main>
  )
}
