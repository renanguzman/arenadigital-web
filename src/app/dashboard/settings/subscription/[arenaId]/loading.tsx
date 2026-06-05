import { DashboardBlocksLoading } from "@/components/dashboard/DashboardLoadingState"

export default function Loading() {
    return (
        <DashboardBlocksLoading
            cardCount={4}
            gridClassName="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
            cardClassName="h-56 w-full"
        />
    )
}
