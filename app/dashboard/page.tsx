import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export default async function DashboardPage() {
    const session = await auth();
    const isSuperAdmin =
        (session?.user as { role: UserRole })?.role === "SUPER_ADMIN";

    // Get stats
    const stats = await getStats(session!.user!.id as string, isSuperAdmin);

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Welcome back, {session?.user?.name}!
                </h1>
                <p className="text-gray-600">
                    Manage your wedding invitations and guests
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Total Guests"
                    value={stats.totalGuests}
                    icon="👥"
                    color="blue"
                />
                <StatCard
                    title="Confirmed"
                    value={stats.confirmed}
                    icon="✅"
                    color="green"
                />
                <StatCard
                    title="Pending"
                    value={stats.pending}
                    icon="⏳"
                    color="yellow"
                />
                <StatCard
                    title="Declined"
                    value={stats.declined}
                    icon="❌"
                    color="red"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <StatCard
                    title="Pemberkatan Saja"
                    value={stats.pemberkatanOnly}
                    icon="⛪"
                    color="blue"
                />
                <StatCard
                    title="Keduanya"
                    value={stats.both}
                    icon="🎉"
                    color="green"
                />
            </div>

            {isSuperAdmin && (
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">
                        Super Admin Overview
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-gray-600 text-sm">
                                Total Weddings
                            </p>
                            <p className="text-2xl font-bold text-pink-600">
                                {stats.totalWeddings}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-600 text-sm">
                                Total Admins
                            </p>
                            <p className="text-2xl font-bold text-purple-600">
                                {stats.totalAdmins}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl shadow-lg p-8 text-white">
                <h2 className="text-2xl font-bold mb-2">Quick Actions</h2>
                <p className="mb-6 text-pink-100">
                    Get started with managing your guests
                </p>
                <div className="flex gap-4">
                    <a
                        href="/dashboard/guests"
                        className="bg-white text-pink-600 px-6 py-3 rounded-lg font-semibold hover:bg-pink-50 transition"
                    >
                        Manage Guests
                    </a>
                    {isSuperAdmin && (
                        <a
                            href="/dashboard/users"
                            className="bg-white/20 backdrop-blur text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/30 transition"
                        >
                            Manage Users
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({
    title,
    value,
    icon,
    color,
}: {
    title: string;
    value: number;
    icon: string;
    color: "blue" | "green" | "yellow" | "red";
}) {
    const colors = {
        blue: "from-blue-500 to-blue-600",
        green: "from-green-500 to-green-600",
        yellow: "from-yellow-500 to-yellow-600",
        red: "from-red-500 to-red-600",
    };

    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">{icon}</span>
                <div
                    className={`w-12 h-12 rounded-full bg-gradient-to-r ${
                        colors[color as keyof typeof colors]
                    } opacity-20`}
                ></div>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
    );
}

async function getStats(userId: string, isSuperAdmin: boolean) {
    if (isSuperAdmin) {
        const [
            totalGuests,
            confirmed,
            pending,
            declined,
            pemberkatanOnlyResult,
            bothResult,
            totalWeddings,
            totalAdmins,
        ] = await Promise.all([
            prisma.guest.count(),
            prisma.guest.count({ where: { rsvpStatus: "CONFIRMED" } }),
            prisma.guest.count({ where: { rsvpStatus: "PENDING" } }),
            prisma.guest.count({ where: { rsvpStatus: "DECLINED" } }),
            prisma.guest.aggregate({
                where: {
                    isOnlyPemberkatan: true,
                    rsvpStatus: "CONFIRMED",
                },
                _sum: { numberOfGuests: true },
            }),
            prisma.guest.aggregate({
                where: {
                    eventType: "blessing-reception",
                    rsvpStatus: "CONFIRMED",
                },
                _sum: { numberOfGuests: true },
            }),
            prisma.wedding.count(),
            prisma.user.count(),
        ]);

        return {
            totalGuests,
            confirmed,
            pending,
            declined,
            pemberkatanOnly: pemberkatanOnlyResult._sum.numberOfGuests || 0,
            both: bothResult._sum.numberOfGuests || 0,
            totalWeddings,
            totalAdmins,
        };
    } else {
        const userWeddings = await prisma.wedding.findMany({
            where: { adminId: userId },
            select: { id: true },
        });

        const weddingIds = userWeddings.map((w) => w.id);

        const [
            totalGuests,
            confirmed,
            pending,
            declined,
            pemberkatanOnlyResult,
            bothResult,
        ] = await Promise.all([
            prisma.guest.count({
                where: { weddingId: { in: weddingIds } },
            }),
            prisma.guest.count({
                where: {
                    weddingId: { in: weddingIds },
                    rsvpStatus: "CONFIRMED",
                },
            }),
            prisma.guest.count({
                where: {
                    weddingId: { in: weddingIds },
                    rsvpStatus: "PENDING",
                },
            }),
            prisma.guest.count({
                where: {
                    weddingId: { in: weddingIds },
                    rsvpStatus: "DECLINED",
                },
            }),
            prisma.guest.aggregate({
                where: {
                    weddingId: { in: weddingIds },
                    isOnlyPemberkatan: true,
                    rsvpStatus: "CONFIRMED",
                },
                _sum: { numberOfGuests: true },
            }),
            prisma.guest.aggregate({
                where: {
                    weddingId: { in: weddingIds },
                    eventType: "blessing-reception",
                    rsvpStatus: "CONFIRMED",
                },
                _sum: { numberOfGuests: true },
            }),
        ]);

        return {
            totalGuests,
            confirmed,
            pending,
            declined,
            pemberkatanOnly: pemberkatanOnlyResult._sum.numberOfGuests || 0,
            both: bothResult._sum.numberOfGuests || 0,
            totalWeddings: 0,
            totalAdmins: 0,
        };
    }
}
