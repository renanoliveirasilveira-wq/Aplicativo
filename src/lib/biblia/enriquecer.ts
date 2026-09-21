import type { RespostaChat, RespostaChatIa } from "../schemas";
import { buscarMensagemPadrao } from "../mensagens-padrao";
import { buscarContextoLivro } from "./contexto-livro";
import { buscarTextoPorReferencia, buscarVersiculosPorReferencia } from "./consulta";
import { analisarReferencia } from "./referencia";

async function enriquecerReferencia(item: { referencia: string; descricao: string }) {
  return {
    referencia: item.referencia,
    texto: await buscarTextoPorReferencia(item.referencia),
    descricao: item.descricao,
  };
}

// Numa "resposta_especifica" o campo "referencia" às vezes herda o
// contexto da conversa (ex.: um capítulo inteiro perguntado antes), não só
// o trecho específico da pergunta atual. Só vale a pena mostrar a citação
// em destaque quando ela é curta (poucos versículos) — citar um capítulo
// inteiro de novo, em cima de uma resposta pontual, é só ruído visual.
const MAX_VERSICULOS_CITACAO_CURTA = 6;

async function buscarVersiculosReferenciaCurta(referenciaTexto: string | null) {
  if (!referenciaTexto) return null;
  const ref = analisarReferencia(referenciaTexto);
  if (!ref || ref.versiculoInicio == null || ref.versiculoFim == null) return null;
  if (ref.versiculoFim - ref.versiculoInicio + 1 > MAX_VERSICULOS_CITACAO_CURTA) return null;
  return buscarVersiculosPorReferencia(referenciaTexto);
}

// Recebe a resposta "crua" da IA (só referências, sem texto bíblico) e
// devolve a forma final, com o texto de cada referência buscado na base
// local — é essa forma final que é salva no banco e enviada ao cliente.
export async function enriquecerComTextoBiblico(
  bruto: RespostaChatIa,
): Promise<RespostaChat> {
  if (bruto.tipo === "fora_do_escopo") {
    return {
      tipo: "fora_do_escopo",
      mensagem: await buscarMensagemPadrao("fora_do_escopo"),
    };
  }

  if (bruto.tipo === "analise_completa") {
    const d = bruto.dados;
    const livroId = analisarReferencia(d.referencia)?.livroId;

    const [versiculos, contextoLivro, referencias_relacionadas, textos_paralelos] =
      await Promise.all([
        buscarVersiculosPorReferencia(d.referencia),
        buscarContextoLivro(livroId),
        Promise.all(
          d.passo_2_interpretacao_biblia_com_biblia.referencias_relacionadas.map(
            enriquecerReferencia,
          ),
        ),
        Promise.all(
          d.passo_2_interpretacao_biblia_com_biblia.textos_paralelos.map(
            enriquecerReferencia,
          ),
        ),
      ]);

    return {
      tipo: "analise_completa",
      dados: {
        versiculos,
        referencia: d.referencia,
        passo_1_contexto: {
          contexto_geral_do_livro: contextoLivro?.contextoGeral ?? null,
          contexto_literario_do_livro: contextoLivro?.contextoLiterario ?? null,
          quem_escreveu: d.passo_1_contexto.quem_escreveu,
          contexto_historico_cultural: d.passo_1_contexto.contexto_historico_cultural,
          geografia: d.passo_1_contexto.geografia,
          orientacao_leitura: d.passo_1_contexto.orientacao_leitura,
          curiosidades: d.passo_1_contexto.curiosidades,
          observacoes_adicionais: d.passo_1_contexto.observacoes_adicionais,
        },
        passo_2_interpretacao_biblia_com_biblia: {
          referencias_relacionadas,
          textos_paralelos,
          padroes_biblicos: d.passo_2_interpretacao_biblia_com_biblia.padroes_biblicos,
        },
      },
    };
  }

  return {
    tipo: "resposta_especifica",
    referencia: bruto.referencia,
    versiculosReferencia: await buscarVersiculosReferenciaCurta(bruto.referencia),
    resposta: bruto.resposta,
  };
}
