import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        const data = await request.json();

        // Get the current guest to check weddingId
        const currentGuest = await prisma.guest.findUnique({
            where: { id },
            select: { weddingId: true, phone: true },
        });

        if (!currentGuest) {
            return NextResponse.json(
                { error: "Guest not found" },
                { status: 404 },
            );
        }

        // If phone is being updated, check for uniqueness within the wedding
        if (data.phone && data.phone !== currentGuest.phone) {
            const existingGuest = await prisma.guest.findUnique({
                where: {
                    weddingId_phone: {
                        weddingId: currentGuest.weddingId,
                        phone: data.phone,
                    },
                },
            });

            if (existingGuest) {
                return NextResponse.json(
                    { error: "Phone number already exists for this wedding" },
                    { status: 400 },
                );
            }
        }

        // Convert empty string phone to null to avoid unique constraint issues
        if (data.phone === "") {
            data.phone = null;
        }

        const guest = await prisma.guest.update({
            where: { id },
            data,
        });

        return NextResponse.json(guest);
    } catch (error) {
        console.error("Error updating guest:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        await prisma.guest.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting guest:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
