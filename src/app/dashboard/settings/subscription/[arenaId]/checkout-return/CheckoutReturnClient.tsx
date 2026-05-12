'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type Status = 'success' | 'canceled' | 'expired' | null;

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60_000;

type Props = {
  arenaId: string;
  initialStatus: string | null;
};

type ViewState =
  | { kind: 'polling' }
  | { kind: 'confirmed' }
  | { kind: 'still_processing' }
  | { kind: 'canceled' }
  | { kind: 'expired' };

function normalizeStatus(value: string | null): Status {
  if (value === 'success' || value === 'canceled' || value === 'expired') {
    return value;
  }
  return null;
}

export function CheckoutReturnClient({ arenaId, initialStatus }: Props) {
  const router = useRouter();
  const status = normalizeStatus(initialStatus);

  const [view, setView] = useState<ViewState>(() => {
    if (status === 'canceled') return { kind: 'canceled' };
    if (status === 'expired') return { kind: 'expired' };
    return { kind: 'polling' };
  });

  useEffect(() => {
    if (view.kind !== 'polling') return;

    let cancelled = false;
    const startedAt = Date.now();

    async function poll() {
      try {
        const res = await fetch(`/api/payments/subscriptions/${arenaId}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = (await res.json()) as { status?: string };
        if (cancelled) return;
        if (data.status === 'active') {
          setView({ kind: 'confirmed' });
          return;
        }
      } catch {
        // ignora erro de fetch — vai tentar de novo
      }

      if (cancelled) return;

      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setView({ kind: 'still_processing' });
        return;
      }

      setTimeout(poll, POLL_INTERVAL_MS);
    }

    poll();

    return () => {
      cancelled = true;
    };
  }, [arenaId, view.kind]);

  function goBackToSubscription() {
    router.push(`/dashboard/settings/subscription/${arenaId}`);
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 py-12">
      <Card>
        <CardContent className="flex flex-col items-center gap-5 py-12 text-center">
          {view.kind === 'polling' && (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-arena-button" />
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-arena-navy-800">
                  Confirmando pagamento...
                </h2>
                <p className="text-sm text-muted-foreground">
                  Estamos validando seu pagamento com o Asaas. Isso pode levar
                  alguns segundos.
                </p>
              </div>
            </>
          )}

          {view.kind === 'confirmed' && (
            <>
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-arena-navy-800">
                  Assinatura ativada!
                </h2>
                <p className="text-sm text-muted-foreground">
                  Seu pagamento foi confirmado com sucesso.
                </p>
              </div>
              <Button
                onClick={goBackToSubscription}
                className="bg-arena-button text-white hover:bg-arena-button-hover"
              >
                Ver assinatura
              </Button>
            </>
          )}

          {view.kind === 'still_processing' && (
            <>
              <Loader2 className="h-10 w-10 text-arena-button" />
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-arena-navy-800">
                  Pagamento em processamento
                </h2>
                <p className="text-sm text-muted-foreground">
                  Seu pagamento ainda está sendo processado pelo Asaas. Assim
                  que for confirmado, sua assinatura será ativada
                  automaticamente. Você pode atualizar a página de assinatura
                  em alguns minutos.
                </p>
              </div>
              <Button
                onClick={goBackToSubscription}
                className="bg-arena-button text-white hover:bg-arena-button-hover"
              >
                Voltar à assinatura
              </Button>
            </>
          )}

          {view.kind === 'canceled' && (
            <>
              <XCircle className="h-12 w-12 text-amber-500" />
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-arena-navy-800">
                  Pagamento cancelado
                </h2>
                <p className="text-sm text-muted-foreground">
                  Você cancelou o pagamento. Sua assinatura não foi alterada.
                </p>
              </div>
              <Button
                onClick={goBackToSubscription}
                variant="outline"
                className="border-arena-navy-800 text-arena-navy-800"
              >
                Voltar
              </Button>
            </>
          )}

          {view.kind === 'expired' && (
            <>
              <XCircle className="h-12 w-12 text-red-500" />
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-arena-navy-800">
                  Link expirado
                </h2>
                <p className="text-sm text-muted-foreground">
                  O link de pagamento expirou. Por favor, inicie um novo
                  checkout para ativar sua assinatura.
                </p>
              </div>
              <Button
                onClick={goBackToSubscription}
                className="bg-arena-button text-white hover:bg-arena-button-hover"
              >
                Tentar novamente
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
