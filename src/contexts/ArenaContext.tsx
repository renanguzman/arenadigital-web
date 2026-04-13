"use client"

import React, { createContext, useContext, useState, useEffect } from "react";
import { useDbUser } from "@/contexts/UserContext";

interface Arena {
    id: string;
    name: string;
}

interface ArenaContextType {
    selectedArena: string;
    setSelectedArena: (id: string) => void;
    arenas: Arena[];
    isLoadingArenas: boolean;
}

const ArenaContext = createContext<ArenaContextType | undefined>(undefined);

export function ArenaProvider({ children }: { children: React.ReactNode }) {
    const [selectedArena, setSelectedArena] = useState<string>("");
    const [arenas, setArenas] = useState<Arena[]>([]);
    const [isLoadingArenas, setIsLoadingArenas] = useState(true);
    const { dbUser } = useDbUser();

    useEffect(() => {
        async function fetchArenas() {
            if (!dbUser) {
                setArenas([]);
                setSelectedArena("");
                setIsLoadingArenas(false);
                return;
            }

            setIsLoadingArenas(true);

            try {
                const response = await fetch('/api/arenas', {
                    credentials: 'same-origin',
                });

                if (!response.ok) {
                    throw new Error('Falha ao carregar arenas');
                }

                const data: Arena[] = await response.json();
                setArenas(data);
                setSelectedArena((currentArenaId) => {
                    if (currentArenaId && data.some((arena) => arena.id === currentArenaId)) {
                        return currentArenaId;
                    }

                    return data[0]?.id ?? "";
                });
            } catch (error) {
                console.error('Error fetching arenas:', error);
                setArenas([]);
                setSelectedArena("");
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
