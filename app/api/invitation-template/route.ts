import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Get invitation template for a wedding
export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weddingId = searchParams.get("weddingId");

    if (!weddingId) {
        return NextResponse.json(
            { error: "Wedding ID required" },
            { status: 400 }
        );
    }

    try {
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

        // Get or create template with default
        let template = await prisma.invitationTemplate.findUnique({
            where: { weddingId },
        });

        if (!template) {
            // Create default template
            const defaultTemplate = `Halo {guestName}! 👋

Kami dengan senang hati mengundang Anda untuk menghadiri pernikahan kami:

💑 {weddingName}
📅 {weddingDate}
📍 {venue}

Silakan konfirmasi kehadiran Anda melalui link berikut:
🔗 {invitationUrl}

Terima kasih! 🙏`;

            template = await prisma.invitationTemplate.create({
                data: {
                    weddingId,
                    template: defaultTemplate,
                },
            });
        }

        return NextResponse.json(template);
    } catch (error) {
        console.error("Error fetching template:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// Update invitation template
export async function PUT(request: NextRequest) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { weddingId, template } = await request.json();

        if (!weddingId || !template) {
            return NextResponse.json(
                { error: "Wedding ID and template required" },
                { status: 400 }
            );
        }

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

        // Upsert template
        const updatedTemplate = await prisma.invitationTemplate.upsert({
            where: { weddingId },
            update: { template },
            create: {
                weddingId,
                template,
            },
        });

        return NextResponse.json(updatedTemplate);
    } catch (error) {
        console.error("Error updating template:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
