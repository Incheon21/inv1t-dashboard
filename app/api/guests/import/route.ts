import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Function to generate unique invitation code
function generateInvitationCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 10; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

interface CSVGuest {
    name: string;
    email?: string;
    phone?: string;
    numberOfGuests?: string;
    maxGuests?: string;
    isOnlyPemberkatan?: string;
    notes?: string;
}

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { weddingId, guests } = await request.json();

        console.log("=== Import Debug ===");
        console.log("Wedding ID:", weddingId);
        console.log("Raw guests data:", JSON.stringify(guests, null, 2));

        // Verify user has access to this wedding
        const wedding = await prisma.wedding.findFirst({
            where: {
                id: weddingId,
                OR: [
                    { adminId: session.user!.id as string },
                    { admin: { role: "SUPER_ADMIN" } },
                ],
            },
        });

        if (!wedding) {
            console.log("Wedding not found or access denied");
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        console.log("Wedding found:", wedding.name);

        // Process CSV data
        const guestData = guests
            .filter((g: CSVGuest) => g.name && g.name.trim() !== "")
            .map((g: CSVGuest) => ({
                weddingId,
                name: g.name.trim(),
                email: g.email?.trim() || null,
                maxGuests:
                    parseInt(g.maxGuests || g.numberOfGuests || "1") || 1,
                isOnlyPemberkatan:
                    g.isOnlyPemberkatan === "true" ||
                    g.isOnlyPemberkatan === "1",
                phone: g.phone?.trim() || null,
                numberOfGuests: parseInt(g.numberOfGuests || "1") || 1,
                notes: g.notes?.trim() || null,
                invitationCode: generateInvitationCode(),
            }));

        console.log(
            "Processed guest data:",
            JSON.stringify(guestData, null, 2)
        );
        console.log("Total guests to create:", guestData.length);

        // Try to create guests one by one to handle duplicates better
        let successCount = 0;
        let duplicateCount = 0;

        for (const guest of guestData) {
            try {
                await prisma.guest.create({
                    data: guest,
                });
                successCount++;
            } catch (error: any) {
                if (error.code === "P2002") {
                    // Unique constraint violation - guest already exists
                    console.log(
                        `Guest "${guest.name}" already exists (duplicate phone or invitation code)`
                    );
                    duplicateCount++;
                } else {
                    console.error(
                        `Error creating guest "${guest.name}":`,
                        error
                    );
                    throw error;
                }
            }
        }

        console.log("Created guests:", successCount);
        console.log("Duplicate guests skipped:", duplicateCount);

        return NextResponse.json({
            count: successCount,
            duplicates: duplicateCount,
            total: guestData.length,
        });
    } catch (error) {
        console.error("Error importing guests:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
