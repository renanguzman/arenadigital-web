"use client"

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { PaymentSetupForm } from "@/modules/stripe/components/PaymentSetupForm";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { ArenaSubscription } from "@/modules/stripe/usecases/get-subscription.usecase";
import type { PaymentHistoryItem } from "@/modules/stripe/usecases/get-payment-history.usecase";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

type SetupData = {
    clientSecret: string;
    planLabel: string;
    priceCents: number;
};

interface Props {
    arenaId: string;
    initialSubscription: ArenaSubscription;
    initialPaymentHistory: PaymentHistoryItem[];
}

function formatPrice(cents: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function formatDate(iso: string) {
    return new Intl.DateTimeFormat("pt-BR").format(new Date(iso));
}

function capitalizeFirst(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function PaymentStatusBadge({ status }: { status: string }) {
    const config: Record<string, { label: string; className: string }> = {
        paid: { label: "Pago", className: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
        open: { label: "Em aberto", className: "bg-yellow-500/10 text-yellow-700 border-yellow-200" },
        void: { label: "Cancelado", className: "bg-gray-100 text-gray-500 border-gray-200" },
        uncollectible: { label: "Não cobrado", className: "bg-red-500/10 text-red-500 border-red-200" },
        draft: { label: "Rascunho", className: "bg-gray-100 text-gray-500 border-gray-200" },
    };
    const { label, className } = config[status] ?? { label: status, className: "bg-gray-100 text-gray-500 border-gray-200" };
    return <Badge variant="outline" className={className}>{label}</Badge>;
}

export function SubscriptionPageClient({ arenaId, initialSubscription, initialPaymentHistory }: Props) {
    const [subscription, setSubscription] = useState<ArenaSubscription>(initialSubscription);
    const [setupData, setSetupData] = useState<SetupData | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [cardModalOpen, setCardModalOpen] = useState(false);

    async function refreshSubscription() {
        try {
            const res = await fetch(`/api/stripe/subscriptions/${arenaId}`);
            const data = await res.json();
            setSubscription(data);
        } catch {
            toast.error("Erro ao atualizar assinatura.");
        }
    }

    async function handleOpenCardModal() {
        setActionLoading(true);
        try {
            const res = await fetch("/api/stripe/setup-intent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ arenaId }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error ?? "Erro ao iniciar cadastro do cartão.");
                return;
            }
            setSetupData({ clientSecret: data.clientSecret, planLabel: data.planLabel, priceCents: data.priceCents });
            setCardModalOpen(true);
        } finally {
            setActionLoading(false);
        }
    }

    async function handleCancel() {
        setActionLoading(true);
        try {
            const res = await fetch("/api/stripe/subscriptions/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ arenaId, action: "cancel" }),
            });
            if (!res.ok) {
                const data = await res.json();
                toast.error(data.error ?? "Erro ao cancelar assinatura.");
                return;
            }
            toast.success("Assinatura cancelada. Você mantém o acesso até o fim do período atual.");
            setCancelModalOpen(false);
            await refreshSubscription();
        } finally {
            setActionLoading(false);
        }
    }

    async function handleReactivate() {
        setActionLoading(true);
        try {
            const res = await fetch("/api/stripe/subscriptions/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ arenaId, action: "reactivate" }),
            });
            if (!res.ok) {
                const data = await res.json();
                toast.error(data.error ?? "Erro ao reativar assinatura.");
                return;
            }
            toast.success("Assinatura reativada com sucesso!");
            await refreshSubscription();
        } finally {
            setActionLoading(false);
        }
    }

    function handlePaymentSuccess() {
        setSetupData(null);
        setCardModalOpen(false);
        toast.success("Cartão atualizado com sucesso!");
        refreshSubscription();
    }

    function handleCloseCardModal() {
        setCardModalOpen(false);
        setSetupData(null);
    }

    const hasSubscription = subscription.status !== "none";

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Assinatura</h2>
                <p className="text-muted-foreground mt-1">
                    Gerencie sua assinatura e configurações de pagamento.
                </p>
            </div>

            {/* No subscription state */}
            {!hasSubscription && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                        <div className="rounded-full bg-muted p-4">
                            <AlertCircle className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="font-medium">Nenhuma assinatura ativa</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Cadastre um cartão para ativar sua assinatura.
                            </p>
                        </div>
                        <Button
                            onClick={handleOpenCardModal}
                            disabled={actionLoading}
                            className="bg-[#FF6B00] hover:bg-[#E66000] text-white"
                        >
                            {actionLoading ? "Aguarde..." : "Cadastrar cartão"}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Active subscription — tabbed view */}
            {hasSubscription && (
                <Tabs defaultValue="dados-basicos">
                    <TabsList variant="line">
                        <TabsTrigger value="dados-basicos">Dados básicos</TabsTrigger>
                        <TabsTrigger value="historico">Histórico de pagamentos</TabsTrigger>
                    </TabsList>

                    <TabsContent value="dados-basicos" className="mt-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Plano de assinatura */}
                            <Card>
                                <CardContent className="pt-6 space-y-5">
                                    <h3 className="text-lg font-semibold">Plano de assinatura</h3>

                                    <div className="grid grid-cols-2 gap-y-5 gap-x-8">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Tipo</p>
                                            <p className="text-sm font-medium mt-0.5">
                                                {subscription.planLabel ?? "—"}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Valor</p>
                                            <p className="text-sm font-medium mt-0.5">
                                                {subscription.priceCents
                                                    ? formatPrice(subscription.priceCents)
                                                    : "—"}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Data de renovação</p>
                                            <p className="text-sm font-medium mt-0.5">
                                                {subscription.currentPeriodEnd
                                                    ? formatDate(subscription.currentPeriodEnd)
                                                    : "—"}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Forma de pagamento</p>
                                            <p className="text-sm font-medium mt-0.5">
                                                {subscription.paymentMethod ?? "—"}
                                            </p>
                                        </div>
                                    </div>

                                    {subscription.status === "past_due" && (
                                        <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
                                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                            Pagamento em atraso. Verifique seu cartão.
                                        </div>
                                    )}

                                    <div className="pt-1">
                                        {subscription.cancelAtPeriodEnd ? (
                                            <button
                                                onClick={handleReactivate}
                                                disabled={actionLoading}
                                                className="text-sm text-[#FF6B00] hover:underline disabled:opacity-50"
                                            >
                                                Manter assinatura
                                            </button>
                                        ) : (
                                            subscription.status === "active" && (
                                                <button
                                                    onClick={() => setCancelModalOpen(true)}
                                                    disabled={actionLoading}
                                                    className="text-sm text-[#1B7B8A] hover:underline disabled:opacity-50"
                                                >
                                                    Cancelar assinatura
                                                </button>
                                            )
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Dados do cartão */}
                            <Card>
                                <CardContent className="pt-6 space-y-5">
                                    <h3 className="text-lg font-semibold">Dados do cartão</h3>

                                    {subscription.card ? (
                                        <>
                                            <div className="grid grid-cols-2 gap-y-5 gap-x-8">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Bandeira</p>
                                                    <p className="text-sm font-medium mt-0.5">
                                                        {capitalizeFirst(subscription.card.brand)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">terminando em</p>
                                                    <p className="text-sm font-medium mt-0.5">
                                                        {subscription.card.last4}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Data do próximo débito</p>
                                                    <p className="text-sm font-medium mt-0.5">
                                                        {subscription.currentPeriodEnd
                                                            ? formatDate(subscription.currentPeriodEnd)
                                                            : "—"}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="pt-1 flex justify-end">
                                                <button
                                                    onClick={handleOpenCardModal}
                                                    disabled={actionLoading}
                                                    className="text-sm text-[#1B7B8A] hover:underline disabled:opacity-50"
                                                >
                                                    Alterar cartão
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="space-y-3">
                                            <p className="text-sm text-muted-foreground">
                                                Nenhum cartão cadastrado.
                                            </p>
                                            <button
                                                onClick={handleOpenCardModal}
                                                disabled={actionLoading}
                                                className="text-sm text-[#1B7B8A] hover:underline disabled:opacity-50"
                                            >
                                                Cadastrar cartão
                                            </button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="historico" className="mt-6">
                        <Card>
                            <CardContent className="pt-6">
                                <h3 className="text-lg font-semibold mb-4">Seus pagamentos</h3>

                                {initialPaymentHistory.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-8 text-center">
                                        Nenhum pagamento registrado.
                                    </p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-[#1B7B8A]">Valor</TableHead>
                                                <TableHead className="text-[#1B7B8A]">Status</TableHead>
                                                <TableHead className="text-[#1B7B8A]">Nº do pedido</TableHead>
                                                <TableHead className="text-[#1B7B8A]">Data</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {initialPaymentHistory.map((payment) => (
                                                <TableRow key={payment.id}>
                                                    <TableCell>
                                                        {formatPrice(payment.amountCents)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <PaymentStatusBadge status={payment.status} />
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {payment.invoiceNumber ?? "—"}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {formatDate(payment.createdAt)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}

            {/* Modal: Alterar cartão */}
            <Dialog open={cardModalOpen} onOpenChange={(open) => { if (!open) handleCloseCardModal(); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-[#0D3B45]">
                            Alterar cartão
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Insira os dados do novo cartão de pagamento.
                        </DialogDescription>
                    </DialogHeader>

                    {setupData ? (
                        <Elements
                            stripe={stripePromise}
                            options={{
                                clientSecret: setupData.clientSecret,
                                appearance: {
                                    theme: "stripe",
                                    variables: {
                                        colorPrimary: "#FF6B00",
                                        borderRadius: "8px",
                                    },
                                },
                                locale: "pt-BR",
                            }}
                        >
                            <PaymentSetupForm
                                arenaId={arenaId}
                                onSuccess={handlePaymentSuccess}
                                onError={(msg) => toast.error(msg)}
                                onCancel={handleCloseCardModal}
                                submitLabel="Salvar"
                            />
                        </Elements>
                    ) : (
                        <div className="flex items-center justify-center py-8">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal: Cancelamento de assinatura */}
            <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-[#0D3B45]">
                            Cancelamento de assinatura
                        </DialogTitle>
                        <DialogDescription className="text-sm text-foreground mt-2">
                            Tem certeza que deseja cancelar sua assinatura? Tudo o que foi
                            inserido dentro da plataforma será excluído.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="flex-row gap-3 sm:justify-start mt-2">
                        <Button
                            variant="outline"
                            className="flex-1 border-[#0D3B45] text-[#0D3B45]"
                            onClick={() => setCancelModalOpen(false)}
                            disabled={actionLoading}
                        >
                            Fechar
                        </Button>
                        <Button
                            className="flex-1 bg-[#FF6B00] hover:bg-[#E66000] text-white"
                            onClick={handleCancel}
                            disabled={actionLoading}
                        >
                            {actionLoading ? "Cancelando..." : "Cancelar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
