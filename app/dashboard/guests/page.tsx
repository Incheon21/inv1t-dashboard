import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GuestList } from "./components/GuestList";
import { AddGuestForm } from "./components/AddGuestForm";
import { CSVUpload } from "./components/CSVUpload";
import { UserRole } from "@prisma/client";

export default async function GuestsPage() {
    const session = await auth();
    const isSuperAdmin =
        (session?.user as { role: UserRole })?.role === "SUPER_ADMIN";

    // Get user's weddings
    const weddings = await prisma.wedding.findMany({
        where: isSuperAdmin ? {} : { adminId: session!.user!.id as string },
        select: {
            id: true,
            name: true,
            slug: true,
        },
    });

    // Get guests for the weddings
    const guests = await prisma.guest.findMany({
        where: {
            weddingId: { in: weddings.map((w) => w.id) },
        },
        include: {
            wedding: {
                select: {
                    name: true,
                    slug: true,
                    weddingDate: true,
                    venue: true,
                    invitationTemplate: {
                        select: {
                            template: true,
                        },
                    },
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Guest Management
                </h1>
                <p className="text-gray-600">
                    Add and manage your wedding guests
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-xl font-semibold mb-4">
                            Add Guest Manually
                        </h2>
                        <AddGuestForm weddings={weddings} />
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-xl font-semibold mb-4">
                        Import from CSV
                    </h2>
                    <CSVUpload weddings={weddings} />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Guest List</h2>
                <GuestList guests={guests} />
            </div>
        </div>
    );
}
