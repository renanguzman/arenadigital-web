export function canReactivateRotativo(data: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sessionDate = new Date(`${data}T12:00:00`)
  sessionDate.setHours(0, 0, 0, 0)
  return sessionDate >= today
}

export function formatRotativoTime(time: string) {
  return time.slice(0, 5).replace(':', 'h')
}

export function calculateCreditPurchaseValue(
  quantidade: number,
  pacotes: { quantidade: number; valor_reais: number }[]
): number {
  if (quantidade <= 0) throw new Error('Quantidade inválida')
  if (pacotes.length === 0) {
    throw new Error('Configure os pacotes de crédito antes de lançar.')
  }

  const exact = pacotes.find((p) => p.quantidade === quantidade)
  if (exact) return exact.valor_reais

  const reference = pacotes[0]
  const unitPrice = reference.valor_reais / reference.quantidade
  return Math.round(unitPrice * quantidade * 100) / 100
}
