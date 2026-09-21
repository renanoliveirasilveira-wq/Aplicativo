type Livro = {
  id: string;
  abrev: string;
  nome: string;
};

// Os 66 livros da Bíblia, na ordem canônica. `id` é a chave usada para
// guardar e consultar o texto na tabela local `versiculo_biblico` — vem da
// abreviação do dataset Almeida 1911, mantendo o acento de "Jó" pra não
// colidir com a abreviação "Jo" de João.
const LIVROS: Livro[] = [
  { id: "gn", abrev: "Gn", nome: "Gênesis" },
  { id: "êx", abrev: "Êx", nome: "Êxodo" },
  { id: "lv", abrev: "Lv", nome: "Levítico" },
  { id: "nm", abrev: "Nm", nome: "Números" },
  { id: "dt", abrev: "Dt", nome: "Deuteronômio" },
  { id: "js", abrev: "Js", nome: "Josué" },
  { id: "jz", abrev: "Jz", nome: "Juízes" },
  { id: "rt", abrev: "Rt", nome: "Rute" },
  { id: "1sm", abrev: "1Sm", nome: "1 Samuel" },
  { id: "2sm", abrev: "2Sm", nome: "2 Samuel" },
  { id: "1rs", abrev: "1Rs", nome: "1 Reis" },
  { id: "2rs", abrev: "2Rs", nome: "2 Reis" },
  { id: "1cr", abrev: "1Cr", nome: "1 Crônicas" },
  { id: "2cr", abrev: "2Cr", nome: "2 Crônicas" },
  { id: "ed", abrev: "Ed", nome: "Esdras" },
  { id: "ne", abrev: "Ne", nome: "Neemias" },
  { id: "et", abrev: "Et", nome: "Ester" },
  { id: "jó", abrev: "Jó", nome: "Jó" },
  { id: "sl", abrev: "Sl", nome: "Salmos" },
  { id: "pv", abrev: "Pv", nome: "Provérbios" },
  { id: "ec", abrev: "Ec", nome: "Eclesiastes" },
  { id: "ct", abrev: "Ct", nome: "Cânticos" },
  { id: "is", abrev: "Is", nome: "Isaías" },
  { id: "jr", abrev: "Jr", nome: "Jeremias" },
  { id: "lm", abrev: "Lm", nome: "Lamentações de Jeremias" },
  { id: "ez", abrev: "Ez", nome: "Ezequiel" },
  { id: "dn", abrev: "Dn", nome: "Daniel" },
  { id: "os", abrev: "Os", nome: "Oséias" },
  { id: "jl", abrev: "Jl", nome: "Joel" },
  { id: "am", abrev: "Am", nome: "Amós" },
  { id: "ob", abrev: "Ob", nome: "Obadias" },
  { id: "jn", abrev: "Jn", nome: "Jonas" },
  { id: "mq", abrev: "Mq", nome: "Miquéias" },
  { id: "na", abrev: "Na", nome: "Naum" },
  { id: "hc", abrev: "Hc", nome: "Habacuque" },
  { id: "sf", abrev: "Sf", nome: "Sofonias" },
  { id: "ag", abrev: "Ag", nome: "Ageu" },
  { id: "zc", abrev: "Zc", nome: "Zacarias" },
  { id: "ml", abrev: "Ml", nome: "Malaquias" },
  { id: "mt", abrev: "Mt", nome: "Mateus" },
  { id: "mc", abrev: "Mc", nome: "Marcos" },
  { id: "lc", abrev: "Lc", nome: "Lucas" },
  { id: "jo", abrev: "Jo", nome: "João" },
  { id: "at", abrev: "At", nome: "Atos" },
  { id: "rm", abrev: "Rm", nome: "Romanos" },
  { id: "1co", abrev: "1Co", nome: "1 Coríntios" },
  { id: "2co", abrev: "2Co", nome: "2 Coríntios" },
  { id: "gl", abrev: "Gl", nome: "Gálatas" },
  { id: "ef", abrev: "Ef", nome: "Efésios" },
  { id: "fp", abrev: "Fp", nome: "Filipenses" },
  { id: "cl", abrev: "Cl", nome: "Colossenses" },
  { id: "1ts", abrev: "1Ts", nome: "1 Tessalonicenses" },
  { id: "2ts", abrev: "2Ts", nome: "2 Tessalonicenses" },
  { id: "1tm", abrev: "1Tm", nome: "1 Timóteo" },
  { id: "2tm", abrev: "2Tm", nome: "2 Timóteo" },
  { id: "tt", abrev: "Tt", nome: "Tito" },
  { id: "fm", abrev: "Fm", nome: "Filemom" },
  { id: "hb", abrev: "Hb", nome: "Hebreus" },
  { id: "tg", abrev: "Tg", nome: "Tiago" },
  { id: "1pe", abrev: "1Pe", nome: "1 Pedro" },
  { id: "2pe", abrev: "2Pe", nome: "2 Pedro" },
  { id: "1jo", abrev: "1Jo", nome: "1 João" },
  { id: "2jo", abrev: "2Jo", nome: "2 João" },
  { id: "3jo", abrev: "3Jo", nome: "3 João" },
  { id: "jd", abrev: "Jd", nome: "Judas" },
  { id: "ap", abrev: "Ap", nome: "Apocalipse" },
];

function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizar(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\.$/, "")
    .replace(/\s+/g, " ");
}

const ALIAS_COM_ACENTO = new Map<string, string>();
const ALIAS_SEM_ACENTO = new Map<string, string>();

function registrar(chave: string, id: string) {
  const norm = normalizar(chave);
  if (!ALIAS_COM_ACENTO.has(norm)) ALIAS_COM_ACENTO.set(norm, id);
}

function registrarSemAcento(chave: string, id: string) {
  const norm = normalizar(semAcento(chave));
  if (!ALIAS_SEM_ACENTO.has(norm)) ALIAS_SEM_ACENTO.set(norm, id);
}

const NUMERO_PARA_ROMANO: Record<string, string> = { "1": "I", "2": "II", "3": "III" };

for (const livro of LIVROS) {
  registrar(livro.abrev, livro.id);
  registrar(livro.nome, livro.id);
  registrarSemAcento(livro.nome, livro.id);
  // "Jó" sem acento vira "jo", que colide com a abreviação de João — nesse
  // caso específico não registramos a forma sem acento, então "Jó" só é
  // reconhecido com o acento (como qualquer Bíblia escreveria mesmo).
  if (livro.id !== "jó") {
    registrarSemAcento(livro.abrev, livro.id);
  }

  const numerado = livro.nome.match(/^([123])\s+(.+)$/);
  if (numerado) {
    const [, numero, resto] = numerado;
    const romano = NUMERO_PARA_ROMANO[numero!]!;
    registrar(`${romano} ${resto}`, livro.id);
    registrarSemAcento(`${romano} ${resto}`, livro.id);
  }
}

const ALIASES_MANUAIS: [string, string][] = [
  ["salmo", "sl"],
  ["cantico dos canticos", "ct"],
  ["cântico dos cânticos", "ct"],
  ["cantares", "ct"],
  ["lamentacoes", "lm"],
  ["lamentações", "lm"],
];
for (const [alias, id] of ALIASES_MANUAIS) {
  registrar(alias, id);
  registrarSemAcento(alias, id);
}

function resolverLivro(nome: string): string | null {
  const norm = normalizar(nome);
  const direto = ALIAS_COM_ACENTO.get(norm);
  if (direto) return direto;
  const semAcentoNorm = normalizar(semAcento(nome));
  return ALIAS_SEM_ACENTO.get(semAcentoNorm) ?? null;
}

export type ReferenciaResolvida = {
  livroId: string;
  capitulo: number;
  versiculoInicio?: number;
  versiculoFim?: number;
};

// Aceita: "João 3:16", "João 3.16", "João 3:16-18", "Êxodo 8" (capítulo
// inteiro), "1 Coríntios 13:4-7".
const PADRAO_REFERENCIA = /^(.+?)\s+(\d+)(?:[:.](\d+)(?:\s*[-–]\s*(\d+))?)?$/u;

export function analisarReferencia(texto: string): ReferenciaResolvida | null {
  if (!texto) return null;
  const match = texto.trim().match(PADRAO_REFERENCIA);
  if (!match) return null;

  const [, nomeLivro, capituloStr, versiculoInicioStr, versiculoFimStr] = match;
  const livroId = resolverLivro(nomeLivro!);
  if (!livroId) return null;

  const capitulo = Number(capituloStr);
  if (!Number.isFinite(capitulo) || capitulo < 1) return null;

  const versiculoInicio = versiculoInicioStr ? Number(versiculoInicioStr) : undefined;
  const versiculoFim = versiculoFimStr ? Number(versiculoFimStr) : versiculoInicio;

  return { livroId, capitulo, versiculoInicio, versiculoFim };
}

// Chave estável pra identificar a MESMA referência independente de como
// foi escrita (com/sem acento, abreviada ou não) — usada pra guardar e
// reaproveitar análises já geradas (ver src/lib/biblia/cache-analise.ts).
export function chaveCanonica(ref: ReferenciaResolvida): string {
  const inicio = ref.versiculoInicio ?? "";
  const fim = ref.versiculoFim ?? "";
  return `${ref.livroId}:${ref.capitulo}:${inicio}-${fim}`;
}

// Igual ao PADRAO_REFERENCIA, mas não exige que o nome do livro seja
// reconhecido — usada pra detectar "isso parece uma referência, só que com
// o nome do livro digitado errado" (ver sugerirLivro abaixo), em vez de
// deixar isso cair como se fosse um pedido fora do escopo.
export type TentativaDeReferencia = {
  nomeLivroDigitado: string;
  capitulo: number;
  versiculoInicio?: number;
  versiculoFim?: number;
};

export function analisarTentativaDeReferencia(texto: string): TentativaDeReferencia | null {
  if (!texto) return null;
  const match = texto.trim().match(PADRAO_REFERENCIA);
  if (!match) return null;

  const [, nomeLivro, capituloStr, versiculoInicioStr, versiculoFimStr] = match;
  const capitulo = Number(capituloStr);
  if (!Number.isFinite(capitulo) || capitulo < 1) return null;

  const versiculoInicio = versiculoInicioStr ? Number(versiculoInicioStr) : undefined;
  const versiculoFim = versiculoFimStr ? Number(versiculoFimStr) : versiculoInicio;

  return { nomeLivroDigitado: nomeLivro!.trim(), capitulo, versiculoInicio, versiculoFim };
}

// Distância de edição (quantas trocas/inserções/remoções de letra
// separam duas palavras) — usada só pra sugerir "você quis dizer X?"
// quando o nome de um livro foi digitado com erro de digitação.
function distanciaLevenshtein(a: string, b: string): number {
  const linhas = a.length + 1;
  const colunas = b.length + 1;
  const d: number[][] = Array.from({ length: linhas }, () => new Array<number>(colunas).fill(0));
  for (let i = 0; i < linhas; i++) d[i]![0] = i;
  for (let j = 0; j < colunas; j++) d[0]![j] = j;
  for (let i = 1; i < linhas; i++) {
    for (let j = 1; j < colunas; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i]![j] = Math.min(
        d[i - 1]![j]! + 1,
        d[i]![j - 1]! + 1,
        d[i - 1]![j - 1]! + custo,
      );
    }
  }
  return d[linhas - 1]![colunas - 1]!;
}

// Dado um nome de livro digitado (possivelmente com erro), sugere o livro
// real mais parecido — só se a diferença for pequena o suficiente pra ser
// plausivelmente um erro de digitação, não uma palavra qualquer.
export function sugerirLivro(nomeDigitado: string): string | null {
  const alvo = normalizar(semAcento(nomeDigitado));
  if (!alvo) return null;

  let melhorNome: string | null = null;
  let melhorDistancia = Infinity;

  for (const livro of LIVROS) {
    for (const candidato of [livro.nome, livro.abrev]) {
      const dist = distanciaLevenshtein(alvo, normalizar(semAcento(candidato)));
      if (dist < melhorDistancia) {
        melhorDistancia = dist;
        melhorNome = livro.nome;
      }
    }
  }

  const tolerancia = Math.max(2, Math.ceil(alvo.length * 0.3));
  return melhorNome && melhorDistancia <= tolerancia ? melhorNome : null;
}

// Reconstrói a referência num formato padrão, pra reenvio fácil — ex.:
// ("Lucas", {capitulo:15, versiculoInicio:12}) -> "Lucas 15:12".
export function formatarReferencia(nomeLivro: string, ref: TentativaDeReferencia): string {
  if (ref.versiculoInicio == null) return `${nomeLivro} ${ref.capitulo}`;
  if (ref.versiculoFim == null || ref.versiculoFim === ref.versiculoInicio) {
    return `${nomeLivro} ${ref.capitulo}:${ref.versiculoInicio}`;
  }
  return `${nomeLivro} ${ref.capitulo}:${ref.versiculoInicio}-${ref.versiculoFim}`;
}
