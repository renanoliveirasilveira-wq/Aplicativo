// Limitador simples em memória, por processo. Suficiente para um único
// servidor; se a aplicação rodar em múltiplas instâncias no futuro, troque
// por um armazenamento compartilhado (ex.: tabela no banco ou Redis).
const registros = new Map<string, number[]>();

export function excedeuLimite(
  chave: string,
  { maxPedidos, janelaMs }: { maxPedidos: number; janelaMs: number },
): boolean {
  const agora = Date.now();
  const historico = (registros.get(chave) ?? []).filter(
    (t) => agora - t < janelaMs,
  );

  if (historico.length >= maxPedidos) {
    registros.set(chave, historico);
    return true;
  }

  historico.push(agora);
  registros.set(chave, historico);
  return false;
}
