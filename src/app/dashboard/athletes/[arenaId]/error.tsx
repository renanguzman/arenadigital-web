"use client";

import {
  DashboardErrorState,
  type DashboardRouteError,
} from "@/components/dashboard/DashboardErrorState";

export default function AthletesError({ error, reset }: { error: DashboardRouteError; reset: () => void }) {
  return (
    <DashboardErrorState
      error={error}
      reset={reset}
      title="Erro ao carregar atletas"
      logLabel="athletes"
    />
  );
}
