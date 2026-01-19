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
            <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    Welcome back, {session?.user?.name}!
                </h1>
                <p className="text-sm sm:text-base text-gray-600">
                    Manage your wedding invitations and guests
                </p>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
                <StatCard
                    title="Total Invitations"
                    value={stats.totalInvitations}
                    icon="📨"
                    color="gray"
                />
                <StatCard
                    title="Total Guests"
                    value={stats.totalGuests}
                    icon="👥"
                    color="gray"
                />
                <StatCard
                    title="Confirmed"
                    value={stats.confirmed}
                    icon="✅"
                    color="gray"
                />
                <StatCard
                    title="Pending"
                    value={stats.pending}
                    icon="⏳"
                    color="gray"
                />
                <StatCard
                    title="Declined"
                    value={stats.declined}
                    icon="❌"
                    color="gray"
                />
            </div>

            {/* Event Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                {/* Pemberkatan Card */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                        <div className="bg-gray-100 text-gray-700 rounded-lg w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-xl sm:text-2xl">
                            ⛪
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                                Pemberkatan
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-500">
                                Blessing Ceremony
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">
                                Pemberkatan Saja
                            </p>
                            <p className="text-xl sm:text-2xl font-bold text-gray-900">
                                {stats.pemberkatanOnly}
                            </p>
                            <p className="text-xs text-gray-500">guests</p>
                        </div>
                        <div className="bg-gray-800 text-white rounded-lg p-3 sm:p-4">
                            <p className="text-xs sm:text-sm opacity-75 mb-1">
                                Total Hadir
                            </p>
                            <p className="text-xl sm:text-2xl font-bold">
                                {stats.pemberkatanTotal}
                            </p>
                            <p className="text-xs opacity-60">guests</p>
                        </div>
                    </div>
                </div>

                {/* Resepsi Card */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                        <div className="bg-gray-100 text-gray-700 rounded-lg w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-xl sm:text-2xl">
                            🍽️
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                                Resepsi
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-500">
                                Reception
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                            <p className="text-xs sm:text-sm text-gray-600 mb-1">
                                Resepsi Saja
                            </p>
                            <p className="text-xl sm:text-2xl font-bold text-gray-900">
                                {stats.receptionOnly}
                            </p>
                            <p className="text-xs text-gray-500">guests</p>
                        </div>
                        <div className="bg-gray-800 text-white rounded-lg p-3 sm:p-4">
                            <p className="text-xs sm:text-sm opacity-75 mb-1">
                                Total Hadir
                            </p>
                            <p className="text-xl sm:text-2xl font-bold">
                                {stats.resepsiTotal}
                            </p>
                            <p className="text-xs opacity-60">guests</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Both Events Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow mb-6 sm:mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="bg-gray-100 text-gray-700 rounded-lg w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-xl sm:text-2xl">
                            🎉
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                                Hadir Keduanya
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-500">
                                Attending Both Events
                            </p>
                        </div>
                    </div>
                    <div className="bg-gray-800 text-white rounded-lg px-4 sm:px-6 py-3 sm:py-4 self-start sm:self-auto">
                        <p className="text-2xl sm:text-3xl font-bold">
                            {stats.both}
                        </p>
                        <p className="text-xs sm:text-sm opacity-60">guests</p>
                    </div>
                </div>
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
                            <p className="text-2xl font-bold text-gray-900">
                                {stats.totalWeddings}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-600 text-sm">
                                Total Admins
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                                {stats.totalAdmins}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 sm:p-8">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
                    Quick Actions
                </h2>
                <p className="mb-4 sm:mb-6 text-gray-600 text-sm sm:text-base">
                    Get started with managing your guests
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <a
                        href="/dashboard/guests"
                        className="bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition text-center"
                    >
                        Manage Guests
                    </a>
                    {isSuperAdmin && (
                        <a
                            href="/dashboard/users"
                            className="bg-white border-2 border-gray-900 text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition text-center"
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
    color: "gray";
}) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
                <span className="text-2xl sm:text-3xl">{icon}</span>
            </div>
            <h3 className="text-gray-600 text-xs sm:text-sm font-medium mb-1">
                {title}
            </h3>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                {value}
            </p>
        </div>
    );
}

async function getStats(userId: string, isSuperAdmin: boolean) {
    if (isSuperAdmin) {
        const [
            totalInvitations,
            totalGuestsResult,
            confirmedInvitations,
            pendingInvitations,
            declinedInvitations,
            blessingOnlyResult,
            bothResult,
            receptionOnlyResult,
            totalWeddings,
            totalAdmins,
        ] = await Promise.all([
            prisma.guest.count(),
            prisma.guest.aggregate({
                where: { rsvpStatus: "CONFIRMED" },
                _sum: { numberOfGuests: true },
            }),
            prisma.guest.count({ where: { rsvpStatus: "CONFIRMED" } }),
            prisma.guest.count({ where: { rsvpStatus: "PENDING" } }),
            prisma.guest.count({ where: { rsvpStatus: "DECLINED" } }),
            prisma.guest.aggregate({
                where: {
                    eventType: "blessing-only",
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
            prisma.guest.aggregate({
                where: {
                    eventType: "reception-only",
                    rsvpStatus: "CONFIRMED",
                },
                _sum: { numberOfGuests: true },
            }),
            prisma.wedding.count(),
            prisma.user.count(),
        ]);

        return {
            totalInvitations,
            totalGuests: totalGuestsResult._sum.numberOfGuests || 0,
            confirmed: confirmedInvitations,
            pending: pendingInvitations,
            declined: declinedInvitations,
            pemberkatanOnly: blessingOnlyResult._sum.numberOfGuests || 0,
            pemberkatanTotal:
                (blessingOnlyResult._sum.numberOfGuests || 0) +
                (bothResult._sum.numberOfGuests || 0),
            both: bothResult._sum.numberOfGuests || 0,
            receptionOnly: receptionOnlyResult._sum.numberOfGuests || 0,
            resepsiTotal:
                (receptionOnlyResult._sum.numberOfGuests || 0) +
                (bothResult._sum.numberOfGuests || 0),
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
            totalInvitations,
            totalGuestsResult,
            confirmedInvitations,
            pendingInvitations,
            declinedInvitations,
            blessingOnlyResult,
            bothResult,
            receptionOnlyResult,
        ] = await Promise.all([
            prisma.guest.count({
                where: { weddingId: { in: weddingIds } },
            }),
            prisma.guest.aggregate({
                where: {
                    weddingId: { in: weddingIds },
                    rsvpStatus: "CONFIRMED",
                },
                _sum: { numberOfGuests: true },
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
                    eventType: "blessing-only",
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
            prisma.guest.aggregate({
                where: {
                    weddingId: { in: weddingIds },
                    eventType: "reception-only",
                    rsvpStatus: "CONFIRMED",
                },
                _sum: { numberOfGuests: true },
            }),
        ]);

        return {
            totalInvitations,
            totalGuests: totalGuestsResult._sum.numberOfGuests || 0,
            confirmed: confirmedInvitations,
            pending: pendingInvitations,
            declined: declinedInvitations,
            pemberkatanOnly: blessingOnlyResult._sum.numberOfGuests || 0,
            pemberkatanTotal:
                (blessingOnlyResult._sum.numberOfGuests || 0) +
                (bothResult._sum.numberOfGuests || 0),
            both: bothResult._sum.numberOfGuests || 0,
            receptionOnly: receptionOnlyResult._sum.numberOfGuests || 0,
            resepsiTotal:
                (receptionOnlyResult._sum.numberOfGuests || 0) +
                (bothResult._sum.numberOfGuests || 0),
            totalWeddings: 0,
            totalAdmins: 0,
        };
    }
}
