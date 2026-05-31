'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { TooltipProvider } from '@/components/ui/tooltip';
import { normalizeString } from '@/lib/utils';
import { getAthletesByArenaAction } from '@/modules/athletes/actions/athleteActions';
import { AthletesTable, type Athlete } from './AthletesTable';
import { tutorialAthletes } from '@/lib/tutorial-mock-data';

interface AthletesListProps {
  arenaId: string | null;
  tutorial?: boolean;
}

export function AthletesList({ arenaId, tutorial = false }: AthletesListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadAthletes = useCallback(async () => {
    if (!arenaId) return;
    if (tutorial) {
      setAthletes(tutorialAthletes);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const res = await getAthletesByArenaAction(arenaId);
      setAthletes(res.data as Athlete[]);
    } catch (error) {
      console.error('Error loading athletes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [arenaId, tutorial]);

  useEffect(() => {
    loadAthletes();
  }, [loadAthletes]);

  const filteredAthletes = useMemo(() => {
    const q = normalizeString(searchTerm.trim());
    if (!q) return athletes;
    return athletes.filter((a) => normalizeString(a.name).includes(q));
  }, [athletes, searchTerm]);

  if (!arenaId) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        Carregando dados da arena...
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Card className="rounded-lg border border-slate-100 bg-white px-6 py-6 shadow-sm">
        <div className="mb-8 flex flex-col items-start gap-3">
          <h3 className="font-heading text-xl font-bold text-arena-navy-800">
            Atletas vinculados
          </h3>
          <div className="relative w-full max-w-sm">
            <Input
              placeholder="Buscar por atleta"
              className="h-10 w-full rounded-md border-slate-300 pl-3 pr-10 text-sm text-arena-navy-800 shadow-none placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-[#20B2AA]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <AthletesTable athletes={filteredAthletes} isLoading={isLoading} arenaId={arenaId} />
      </Card>
    </TooltipProvider>
  );
}
