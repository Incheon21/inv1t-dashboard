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

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const data = await request.json();
        const {
            weddingId,
            name,
            email,
            phone,
            numberOfGuests,
            maxGuests,
            isOnlyPemberkatan,
            notes,
        } = data;

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
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const guest = await prisma.guest.create({
            data: {
                weddingId,
                name,
                email: email || null,
                phone: phone || null,
                numberOfGuests: numberOfGuests || 1,
                maxGuests: maxGuests || numberOfGuests || 1,
                isOnlyPemberkatan: isOnlyPemberkatan || false,
                notes: notes || null,
                invitationCode: generateInvitationCode(),
            },
        });

        return NextResponse.json(guest);
    } catch (error) {
        console.error("Error creating guest:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
