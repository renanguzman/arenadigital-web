"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon, Clock, User, MessageCircle, Phone } from "lucide-react"
import { cn } from "@/lib/utils"

interface Booking {
    id: string;
    athlete_name: string | null;
    start_time: string;
    end_time: string;
    status: string | null;
    price?: number | null;
    atleta?: {
        id: string;
        nome_perfil: string;
        telefone: string;
    } | null;
    sports?: {
        id: string;
        name: string;
    };
}

interface DayOpportunitiesModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookings: Booking[];
    currentDate: Date;
}

export function DayOpportunitiesModal({ isOpen, onClose, bookings, currentDate }: DayOpportunitiesModalProps) {
    // Filter bookings for the selected date and ensure they are active (not cancelled)
    // The parent component should pass bookings relevant to the date, but we can double check or sort here.
    const sortedBookings = [...bookings].sort((a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    const handleWhatsAppClick = (phone: string, name: string) => {
        // Remove non-numeric characters
        const cleanPhone = phone.replace(/\D/g, '');
        // Add country code if missing (assuming BR +55 for now if length implies it, or just use as is)
        // Usually stored phones might not have +55.
        const finalPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;

        const message = `Olá ${name}, vi que você tem um jogo marcado na Arena.`;
        const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl bg-[#F8FAFC]">
                <DialogHeader className="p-6 bg-white flex flex-row items-center justify-between border-b border-[#002B40]/5">
                    <div className="space-y-1">
                        <DialogTitle className="text-xl font-black text-[#002B40] tracking-tight">
                            Oportunidades do Dia
                        </DialogTitle>
                        <p className="text-sm font-medium text-[#002B40]/60 flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4" />
                            {format(currentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                    </div>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] p-6">
                    {sortedBookings.length > 0 ? (
                        <div className="space-y-3">
                            {sortedBookings.map((booking) => {
                                const startTime = parseISO(booking.start_time);
                                const endTime = parseISO(booking.end_time);
                                const athleteName = booking.atleta?.nome_perfil || booking.athlete_name;
                                const athletePhone = booking.atleta?.telefone;

                                return (
                                    <div key={booking.id} className="bg-white p-4 rounded-2xl border border-[#002B40]/5 shadow-sm flex items-center justify-between gap-4 hover:border-[#002B40]/10 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-[#FFF5EF] px-3 py-2 rounded-xl flex flex-col items-center justify-center min-w-[70px]">
                                                <span className="text-sm font-black text-[#FF6B00]">
                                                    {format(startTime, "HH:mm")}
                                                </span>
                                                <span className="text-[10px] font-bold text-[#FF6B00]/60">
                                                    às {format(endTime, "HH:mm")}
                                                </span>
                                            </div>

                                            <div className="space-y-0.5">
                                                <p className="font-bold text-[#002B40] text-sm line-clamp-1">
                                                    {athleteName}
                                                </p>
                                                <div className="flex items-center gap-2 text-[10px] uppercase font-black text-[#002B40]/40 tracking-wider">
                                                    <span className="flex items-center gap-1">
                                                        <TrophyIcon className="w-3 h-3" />
                                                        {booking.sports?.name || 'Esporte'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {athletePhone ? (
                                            <Button
                                                size="icon"
                                                className="h-10 w-10 rounded-xl bg-[#25D366] hover:bg-[#128C7E] text-white shadow-lg shadow-[#25D366]/20 shrink-0"
                                                onClick={() => handleWhatsAppClick(athletePhone, athleteName ?? '')}
                                                title={`WhatsApp: ${athletePhone}`}
                                            >
                                                <MessageCircle className="w-5 h-5" />
                                            </Button>
                                        ) : (
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                disabled
                                                className="h-10 w-10 rounded-xl bg-gray-100 text-gray-400 shrink-0 opacity-50"
                                                title="Telefone não disponível"
                                            >
                                                <Phone className="w-5 h-5" />
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                            <div className="h-16 w-16 bg-[#002B40]/5 rounded-full flex items-center justify-center">
                                <CalendarIcon className="w-8 h-8 text-[#002B40]/20" />
                            </div>
                            <div className="space-y-1">
                                <p className="font-bold text-[#002B40]">Nenhum agendamento encontrado</p>
                                <p className="text-sm text-[#002B40]/60">Não há oportunidades para este dia.</p>
                            </div>
                        </div>
                    )}
                </ScrollArea>

                <div className="p-6 bg-white border-t border-[#002B40]/5">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="w-full h-12 border-[#002B40]/10 text-[#002B40] font-bold rounded-xl hover:bg-gray-50 active:scale-95 transition-all"
                    >
                        Fechar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function TrophyIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
    )
}
