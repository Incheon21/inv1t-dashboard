import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, Prisma, RSVPStatus } from "@prisma/client";

// Export guests for WhatsApp integration
export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const weddingId = searchParams.get("weddingId");
        const format = searchParams.get("format") || "json"; // json or csv
        const status = searchParams.get("status"); // Filter by RSVP status

        const isSuperAdmin =
            (session.user as { role: UserRole })?.role === "SUPER_ADMIN";

        // Build query
        const where: Prisma.GuestWhereInput = {};

        if (weddingId) {
            where.weddingId = weddingId;
        } else if (!isSuperAdmin) {
            // Regular admin can only see their weddings
            const userWeddings = await prisma.wedding.findMany({
                where: { adminId: session.user!.id as string },
                select: { id: true },
            });
            where.weddingId = {
                in: userWeddings.map((w: { id: string }) => w.id),
            };
        }

        if (status) {
            where.rsvpStatus = status as RSVPStatus;
        }

        // Only include guests with phone numbers for WhatsApp
        where.phone = { not: null };

        const guests = await prisma.guest.findMany({
            where,
            include: {
                wedding: {
                    select: {
                        name: true,
                        slug: true,
                    },
                },
            },
            orderBy: { name: "asc" },
        });

        if (format === "csv") {
            // Return CSV format
            const csv = [
                "Name,Phone,Email,Wedding,RSVP Status,Number of Guests,Notes",
                ...guests.map((g: (typeof guests)[0]) =>
                    [
                        `"${g.name}"`,
                        g.phone,
                        g.email || "",
                        `"${g.wedding.name}"`,
                        g.rsvpStatus,
                        g.numberOfGuests,
                        `"${g.notes || ""}"`,
                    ].join(",")
                ),
            ].join("\n");

            return new NextResponse(csv, {
                headers: {
                    "Content-Type": "text/csv",
                    "Content-Disposition": `attachment; filename="guests-export-${
                        new Date().toISOString().split("T")[0]
                    }.csv"`,
                },
            });
        }

        // Return JSON format (for WAHA integration)
        const whatsappData = guests.map((g: (typeof guests)[0]) => ({
            id: g.id,
            name: g.name,
            phone: g.phone,
            email: g.email,
            wedding: {
                name: g.wedding.name,
                slug: g.wedding.slug,
            },
            rsvpStatus: g.rsvpStatus,
            numberOfGuests: g.numberOfGuests,
            invitationSent: g.invitationSent,
            invitationSentAt: g.invitationSentAt,
            // WhatsApp link ready to use
            whatsappLink: `https://wa.me/${g.phone?.replace(/[^0-9]/g, "")}`,
        }));

        return NextResponse.json({
            total: whatsappData.length,
            guests: whatsappData,
        });
    } catch (error) {
        console.error("Error exporting guests:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
