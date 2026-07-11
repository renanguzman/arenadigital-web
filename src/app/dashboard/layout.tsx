import { DashboardLayoutWrapper } from "@/components/dashboard/DashboardLayoutWrapper";
import { AuthorizationError, requireWebBackofficeAccess } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    try {
        await requireWebBackofficeAccess();
    } catch (error) {
        if (error instanceof AuthorizationError) {
            const params = new URLSearchParams({ error: error.message });
            redirect(`/auth/sign-out?${params.toString()}`);
        }

        throw error;
    }

    return (
        <DashboardLayoutWrapper>
            {children}
        </DashboardLayoutWrapper>
    );
}
