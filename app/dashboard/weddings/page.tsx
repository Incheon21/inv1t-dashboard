import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WeddingList } from "./components/WeddingList";
import { AddWeddingForm } from "./components/AddWeddingForm";
import { UserRole } from "@prisma/client";

export default async function WeddingsPage() {
    const session = await auth();
    const isSuperAdmin =
        (session?.user as { role: UserRole })?.role === "SUPER_ADMIN";

    if (!isSuperAdmin) {
        redirect("/dashboard");
    }

    const [weddings, admins] = await Promise.all([
        prisma.wedding.findMany({
            include: {
                admin: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                _count: {
                    select: {
                        guests: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        }),
        prisma.user.findMany({
            where: { role: "ADMIN" },
            select: {
                id: true,
                name: true,
                email: true,
            },
        }),
    ]);

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Wedding Management
                </h1>
                <p className="text-gray-600">
                    Create and manage wedding events
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-xl font-semibold mb-4">
                            Add New Wedding
                        </h2>
                        <AddWeddingForm admins={admins} />
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-xl font-semibold mb-4">
                            All Weddings
                        </h2>
                        <WeddingList weddings={weddings} />
                    </div>
                </div>
            </div>
        </div>
    );
}
