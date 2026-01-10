"use client";

import { useRouter } from "next/navigation";
import { Wedding, User } from "@prisma/client";

type WeddingWithDetails = Wedding & {
    admin: Pick<User, "id" | "name" | "email">;
    _count: {
        guests: number;
    };
};

export function WeddingList({ weddings }: { weddings: WeddingWithDetails[] }) {
    const router = useRouter();

    const handleDelete = async (id: string) => {
        if (
            !confirm(
                "Are you sure? This will delete all guests for this wedding!"
            )
        )
            return;

        try {
            await fetch(`/api/weddings/${id}`, { method: "DELETE" });
            router.refresh();
        } catch (error) {
            console.error("Error deleting wedding:", error);
        }
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    return (
        <div className="space-y-4">
            {weddings.map((wedding) => (
                <div
                    key={wedding.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {wedding.name}
                                </h3>
                                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                    /{wedding.slug}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mb-3 text-sm text-gray-600">
                                <div>
                                    <span className="font-medium">
                                        👰 Bride:
                                    </span>{" "}
                                    {wedding.brideName}
                                </div>
                                <div>
                                    <span className="font-medium">
                                        🤵 Groom:
                                    </span>{" "}
                                    {wedding.groomName}
                                </div>
                                <div>
                                    <span className="font-medium">
                                        📅 Date:
                                    </span>{" "}
                                    {formatDate(wedding.weddingDate)}
                                </div>
                                <div>
                                    <span className="font-medium">
                                        📍 Venue:
                                    </span>{" "}
                                    {wedding.venue}
                                </div>
                            </div>

                            {wedding.description && (
                                <p className="text-sm text-gray-500 mb-3">
                                    {wedding.description}
                                </p>
                            )}

                            <div className="flex items-center gap-4 text-sm">
                                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded">
                                    👤 Admin: {wedding.admin.name}
                                </span>
                                <span className="bg-pink-50 text-pink-700 px-3 py-1 rounded">
                                    👥 {wedding._count.guests} guests
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => handleDelete(wedding.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium px-4 py-2 rounded hover:bg-red-50 transition"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            ))}

            {weddings.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                    No weddings created yet
                </p>
            )}
        </div>
    );
}
