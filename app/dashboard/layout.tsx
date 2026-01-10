import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "./components/Sidebar";
import { Toaster } from "react-hot-toast";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session || !session.user) {
        redirect("/login");
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Toaster position="top-right" />
            <Sidebar user={session.user} />
            <main className="flex-1 p-8">{children}</main>
        </div>
    );
}
