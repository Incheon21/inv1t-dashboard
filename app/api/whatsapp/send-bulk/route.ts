import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST /api/whatsapp/send-bulk - Send invitations to multiple guests
export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { guestIds } = await request.json();

        if (!Array.isArray(guestIds) || guestIds.length === 0) {
            return NextResponse.json(
                { error: "Invalid guest IDs" },
                { status: 400 }
            );
        }

        const results = {
            success: [] as string[],
            failed: [] as { id: string; name: string; error: string }[],
        };

        // Process each guest
        for (const guestId of guestIds) {
            try {
                const response = await fetch(
                    `${
                        process.env.AUTH_URL || "http://localhost:3000"
                    }/api/whatsapp/send`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            cookie: request.headers.get("cookie") || "",
                        },
                        body: JSON.stringify({ guestId }),
                    }
                );

                const guest = await prisma.guest.findUnique({
                    where: { id: guestId },
                    select: { name: true },
                });

                if (response.ok) {
                    results.success.push(guest?.name || guestId);
                } else {
                    const error = await response.json();
                    results.failed.push({
                        id: guestId,
                        name: guest?.name || "Unknown",
                        error: error.error || "Unknown error",
                    });
                }

                // Add delay between messages to avoid WhatsApp restrictions
                // 5 seconds minimum recommended for new accounts
                await new Promise((resolve) => setTimeout(resolve, 5000));
            } catch (error) {
                const guest = await prisma.guest.findUnique({
                    where: { id: guestId },
                    select: { name: true },
                });

                results.failed.push({
                    id: guestId,
                    name: guest?.name || "Unknown",
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unknown error",
                });
            }
        }

        return NextResponse.json({
            success: true,
            results,
            summary: {
                total: guestIds.length,
                sent: results.success.length,
                failed: results.failed.length,
            },
        });
    } catch (error) {
        console.error("Error sending bulk WhatsApp messages:", error);
        return NextResponse.json(
            { error: "Failed to send bulk messages" },
            { status: 500 }
        );
    }
}
