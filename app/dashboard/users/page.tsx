import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UserList } from "./components/UserList";
import { AddUserForm } from "./components/AddUserForm";
import { UserRole } from "@prisma/client";

export default async function UsersPage() {
    const session = await auth();
    const isSuperAdmin =
        (session?.user as { role: UserRole })?.role === "SUPER_ADMIN";

    if (!isSuperAdmin) {
        redirect("/dashboard");
    }

    const users = await prisma.user.findMany({
        include: {
            weddings: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    User Management
                </h1>
                <p className="text-gray-600">Manage admin accounts</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-xl font-semibold mb-4">
                            Add New User
                        </h2>
                        <AddUserForm />
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-xl font-semibold mb-4">
                            All Users
                        </h2>
                        <UserList users={users} />
                    </div>
                </div>
            </div>
        </div>
    );
}
