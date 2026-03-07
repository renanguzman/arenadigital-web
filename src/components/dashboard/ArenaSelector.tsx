"use client"

import { useArena } from "@/contexts/ArenaContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ArenaSelector({ isCollapsed }: { isCollapsed?: boolean }) {
    const { arenas, selectedArena, setSelectedArena, isLoadingArenas } = useArena();

    if (isLoadingArenas) {
        return <Skeleton className={cn("h-10 w-full mb-6", isCollapsed ? "px-0" : "px-3")} />;
    }

    if (arenas.length === 0) {
        return null;
    }

    return (
        <div className={cn("mb-6", isCollapsed ? "px-0 flex justify-center" : "px-0")}>
            {isCollapsed ? (
                <div title="Todas as arenas ou Selecionada" className="w-10 h-10 rounded-md bg-white/10 flex items-center justify-center text-white/70 font-bold">
                    A
                </div>
            ) : (
                <Select value={selectedArena} onValueChange={setSelectedArena}>
                    <SelectTrigger className="w-full bg-white/5 border-white/10 text-white focus:ring-white/20">
                        <SelectValue placeholder="Selecione uma arena" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas as arenas</SelectItem>
                        {arenas.map((arena) => (
                            <SelectItem key={arena.id} value={arena.id}>
                                {arena.target_name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        </div>
    );
}
