'use client'

import { useState } from 'react'
import type { PlanKey } from '@/modules/payments/plans'

type Props = {
  arenaId: string
  planKey: PlanKey
  onSuccess: () => void
  onError: (message: string) => void
  onCancel?: () => void
  submitLabel?: string
}

type FormState = {
  cardHolderName: string
  cardNumber: string
  expiry: string
  cvv: string
  holderName: string
  holderEmail: string
  cpfCnpj: string
  postalCode: string
  addressNumber: string
  phone: string
}

const INITIAL_STATE: FormState = {
  cardHolderName: '',
  cardNumber: '',
  expiry: '',
  cvv: '',
  holderName: '',
  holderEmail: '',
  cpfCnpj: '',
  postalCode: '',
  addressNumber: '',
  phone: ''
}

function parseExpiry(expiry: string): { month: string; year: string } | null {
  const cleaned = expiry.replace(/\D/g, '')
  if (cleaned.length !== 4 && cleaned.length !== 6) return null
  const month = cleaned.slice(0, 2)
  const yearPart = cleaned.slice(2)
  const year = yearPart.length === 2 ? `20${yearPart}` : yearPart
  if (Number(month) < 1 || Number(month) > 12) return null
  return { month, year }
}

export function AsaasCardForm({
  arenaId,
  planKey,
  onSuccess,
  onError,
  onCancel,
  submitLabel = 'Salvar'
}: Props) {
  const [form, setForm] = useState<FormState>(INITIAL_STATE)
  const [loading, setLoading] = useState(false)

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const expiry = parseExpiry(form.expiry)
      if (!expiry) {
        onError('Validade do cartão inválida. Use o formato MM/AA.')
        return
      }

      const tokenizeRes = await fetch('/api/payments/tokenize-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          arenaId,
          card: {
            holderName: form.cardHolderName,
            number: form.cardNumber.replace(/\s/g, ''),
            expiryMonth: expiry.month,
            expiryYear: expiry.year,
            cvv: form.cvv
          },
          holder: {
            name: form.holderName,
            email: form.holderEmail,
            cpfCnpj: form.cpfCnpj.replace(/\D/g, ''),
            postalCode: form.postalCode.replace(/\D/g, ''),
            addressNumber: form.addressNumber,
            phone: form.phone.replace(/\D/g, '')
          }
        })
      })

      const tokenData = await tokenizeRes.json()
      if (!tokenizeRes.ok) {
        onError(tokenData.error ?? 'Falha ao tokenizar o cartão.')
        return
      }

      const subscribeRes = await fetch('/api/payments/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          arenaId,
          planKey,
          paymentMethodId: tokenData.token
        })
      })

      const subscribeData = await subscribeRes.json()
      if (!subscribeRes.ok) {
        onError(subscribeData.error ?? 'Falha ao ativar a assinatura.')
        return
      }

      if (subscribeData.status === 'active') {
        onSuccess()
        return
      }

      if (subscribeData.status === 'requires_action') {
        onError(
          'O pagamento exige autenticação adicional. Tente novamente em alguns instantes.'
        )
        return
      }

      onError(subscribeData.message ?? 'Não foi possível ativar a assinatura.')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-[#0D3B45]">Dados do cartão</legend>

        <Field
          label="Nome impresso no cartão"
          value={form.cardHolderName}
          onChange={(v) => update('cardHolderName', v)}
          required
        />

        <Field
          label="Número do cartão"
          value={form.cardNumber}
          onChange={(v) => update('cardNumber', v)}
          inputMode="numeric"
          maxLength={19}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Validade (MM/AA)"
            value={form.expiry}
            onChange={(v) => update('expiry', v)}
            inputMode="numeric"
            maxLength={5}
            placeholder="08/28"
            required
          />
          <Field
            label="CVV"
            value={form.cvv}
            onChange={(v) => update('cvv', v)}
            inputMode="numeric"
            maxLength={4}
            required
          />
        </div>
      </fieldset>

      <fieldset className="space-y-3 border-t border-border pt-4">
        <legend className="text-sm font-semibold text-[#0D3B45]">Dados do titular</legend>

        <Field
          label="Nome completo"
          value={form.holderName}
          onChange={(v) => update('holderName', v)}
          required
        />

        <Field
          label="E-mail"
          type="email"
          value={form.holderEmail}
          onChange={(v) => update('holderEmail', v)}
          required
        />

        <Field
          label="CPF/CNPJ"
          value={form.cpfCnpj}
          onChange={(v) => update('cpfCnpj', v)}
          inputMode="numeric"
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="CEP"
            value={form.postalCode}
            onChange={(v) => update('postalCode', v)}
            inputMode="numeric"
            maxLength={9}
            required
          />
          <Field
            label="Número"
            value={form.addressNumber}
            onChange={(v) => update('addressNumber', v)}
            required
          />
        </div>

        <Field
          label="Telefone"
          value={form.phone}
          onChange={(v) => update('phone', v)}
          inputMode="tel"
          required
        />
      </fieldset>

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-lg border border-[#0D3B45] px-4 py-2.5 text-sm font-medium text-[#0D3B45] hover:bg-[#0D3B45]/5 disabled:opacity-50"
          >
            Fechar
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-lg bg-[#FF6B00] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#E66000] disabled:opacity-50"
        >
          {loading ? 'Processando...' : submitLabel}
        </button>
      </div>
    </form>
  )
}

type FieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  inputMode?: 'text' | 'numeric' | 'tel' | 'email'
  maxLength?: number
  placeholder?: string
  required?: boolean
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  inputMode,
  maxLength,
  placeholder,
  required
}: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-[#FF6B00] focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
      />
    </label>
  )
}
