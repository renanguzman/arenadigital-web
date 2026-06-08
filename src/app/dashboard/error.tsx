"use client";

import { DashboardErrorState, type DashboardRouteError } from "@/components/dashboard/DashboardErrorState";

export default function DashboardError({
  error,
  reset,
}: {
  error: DashboardRouteError;
  reset: () => void;
}) {
  return (
    <DashboardErrorState
      error={error}
      reset={reset}
      logLabel="dashboard"
      fallbackMessage="Ocorreu um erro inesperado. Tente novamente."
      className="gap-6"
      iconClassName="h-12 w-12"
      titleClassName="text-xl"
      messageClassName="max-w-sm text-base"
    />
  );
}
