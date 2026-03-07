"use client"

import React, { createContext, useContext, useState, useEffect } from "react";
import { useUserSync } from "@/hooks/useUserSync";
import { supabase } from "@/shared/database/supabaseClient";

interface Arena {
    id: string;
    target_name: string;
}

interface ArenaContextType {
    selectedArena: string | "all";
    setSelectedArena: (id: string | "all") => void;
    arenas: Arena[];
    isLoadingArenas: boolean;
}

const ArenaContext = createContext<ArenaContextType | undefined>(undefined);

export function ArenaProvider({ children }: { children: React.ReactNode }) {
    const [selectedArena, setSelectedArena] = useState<string | "all">("all");
    const [arenas, setArenas] = useState<Arena[]>([]);
    const [isLoadingArenas, setIsLoadingArenas] = useState(true);
    const { dbUser } = useUserSync();

    useEffect(() => {
        async function fetchArenas() {
            if (!dbUser) {
                setIsLoadingArenas(false);
                return;
            }
            setIsLoadingArenas(true);
            const { data, error } = await supabase
                .from('arenas')
                .select('id, target_name')
                .eq('owner_id', dbUser.id)
                .order('target_name');
            
            if (!error && data) {
                setArenas(data);
            }
            setIsLoadingArenas(false);
        }
        fetchArenas();
    }, [dbUser]);

    return (
        <ArenaContext.Provider value={{ selectedArena, setSelectedArena, arenas, isLoadingArenas }}>
            {children}
        </ArenaContext.Provider>
    );
}

export function useArena() {
    const context = useContext(ArenaContext);
    if (context === undefined) {
        throw new Error("useArena must be used within an ArenaProvider");
    }
    return context;
}
