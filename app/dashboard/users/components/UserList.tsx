"use client";

import { useRouter } from "next/navigation";
import { User, Wedding } from "@prisma/client";

type UserWithWeddings = User & {
    weddings: Pick<Wedding, "id" | "name">[];
};

export function UserList({ users }: { users: UserWithWeddings[] }) {
    const router = useRouter();

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this user?")) return;

        try {
            await fetch(`/api/users/${id}`, { method: "DELETE" });
            router.refresh();
        } catch (error) {
            console.error("Error deleting user:", error);
        }
    };

    return (
        <div className="space-y-4">
            {users.map((user) => (
                <div
                    key={user.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-gray-900">
                                    {user.name}
                                </h3>
                                <span
                                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                                        user.role === "SUPER_ADMIN"
                                            ? "bg-gray-900 text-white"
                                            : "bg-gray-600 text-white"
                                    }`}
                                >
                                    {user.role.replace("_", " ")}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                                ✉️ {user.email}
                            </p>
                            {user.weddings.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {user.weddings.map((wedding) => (
                                        <span
                                            key={wedding.id}
                                            className="text-xs bg-gray-100 text-gray-900 px-2 py-1 rounded"
                                        >
                                            💒 {wedding.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => handleDelete(user.id)}
                            className="text-gray-900 hover:text-gray-700 text-sm font-medium px-4 py-2 rounded hover:bg-gray-100 transition"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
