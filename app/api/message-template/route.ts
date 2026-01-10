import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type SessionUser = {
    id?: string;
    role?: string;
};

// GET /api/message-template - Get message template for current user's wedding
export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const userId = session.user?.id;
        const isSuperAdmin =
            (session.user as SessionUser).role === "SUPER_ADMIN";

        // Get wedding ID from query params or user's wedding
        const { searchParams } = new URL(request.url);
        const weddingId = searchParams.get("weddingId");

        let wedding;
        if (weddingId) {
            // Verify access to this wedding
            wedding = await prisma.wedding.findUnique({
                where: { id: weddingId },
                include: { messageTemplate: true },
            });

            if (!wedding) {
                return NextResponse.json(
                    { error: "Wedding not found" },
                    { status: 404 }
                );
            }

            if (!isSuperAdmin && wedding.adminId !== userId) {
                return NextResponse.json(
                    { error: "Forbidden" },
                    { status: 403 }
                );
            }
        } else {
            // Get user's wedding - for super admin, get first wedding
            if (isSuperAdmin) {
                wedding = await prisma.wedding.findFirst({
                    include: { messageTemplate: true },
                });
            } else {
                wedding = await prisma.wedding.findFirst({
                    where: { adminId: userId },
                    include: { messageTemplate: true },
                });
            }

            if (!wedding) {
                // No wedding found - return empty template for creation
                return NextResponse.json({
                    weddingId: null,
                    name: "Default Template",
                    message: `✨ *WEDDING INVITATION* ✨

Assalamu'alaikum Wr. Wb.

Dear *{GUEST_NAME}*,

With the grace and blessing of Allah SWT, we joyfully invite you to celebrate the wedding of:

*{GROOM_NAME}* 💍 *{BRIDE_NAME}*

🗓 *{WEDDING_DATE}*

📍 *{VENUE}*

━━━━━━━━━━━━━━━━━━━
Your presence would be a great honor for us. Please confirm your attendance through the link below:

🔗 *Digital Invitation & RSVP:*
{INVITATION_URL}

━━━━━━━━━━━━━━━━━━━

May your prayers accompany our journey to build a _sakinah, mawaddah, warahmah_ family.

Wassalamu'alaikum Wr. Wb.

Best Regards,
The Wedding Family 💐`,
                    imageUrl: null,
                    isActive: false,
                    noWedding: true,
                });
            }
        }

        // Return template or default template
        if (wedding.messageTemplate) {
            return NextResponse.json(wedding.messageTemplate);
        }

        // Return default template structure
        return NextResponse.json({
            weddingId: wedding.id,
            name: "Default Template",
            message: `✨ *WEDDING INVITATION* ✨

Assalamu'alaikum Wr. Wb.

Dear *{GUEST_NAME}*,

With the grace and blessing of Allah SWT, we joyfully invite you to celebrate the wedding of:

*{GROOM_NAME}* 💍 *{BRIDE_NAME}*

🗓 *{WEDDING_DATE}*

📍 *{VENUE}*

━━━━━━━━━━━━━━━━━━━
Your presence would be a great honor for us. Please confirm your attendance through the link below:

🔗 *Digital Invitation & RSVP:*
{INVITATION_URL}

━━━━━━━━━━━━━━━━━━━

May your prayers accompany our journey to build a _sakinah, mawaddah, warahmah_ family.

Wassalamu'alaikum Wr. Wb.

Best Regards,
The Wedding Family 💐`,
            imageUrl: null,
            isActive: false,
        });
    } catch (error) {
        console.error("Error fetching message template:", error);
        return NextResponse.json(
            { error: "Failed to fetch message template" },
            { status: 500 }
        );
    }
}

// POST /api/message-template - Create or update message template
export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const userId = session.user?.id;
        const isSuperAdmin =
            (session.user as SessionUser).role === "SUPER_ADMIN";
        const { weddingId, name, message, imageUrl } = await request.json();

        if (!weddingId || !message) {
            return NextResponse.json(
                { error: "Wedding ID and message are required" },
                { status: 400 }
            );
        }

        // Verify access to this wedding
        const wedding = await prisma.wedding.findUnique({
            where: { id: weddingId },
        });

        if (!wedding) {
            return NextResponse.json(
                { error: "Wedding not found" },
                { status: 404 }
            );
        }

        if (!isSuperAdmin && wedding.adminId !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Upsert message template
        const template = await prisma.messageTemplate.upsert({
            where: { weddingId },
            update: {
                name: name || "Custom Template",
                message,
                imageUrl,
                isActive: true,
            },
            create: {
                weddingId,
                name: name || "Custom Template",
                message,
                imageUrl,
                isActive: true,
            },
        });

        return NextResponse.json(template);
    } catch (error) {
        console.error("Error saving message template:", error);
        return NextResponse.json(
            { error: "Failed to save message template" },
            { status: 500 }
        );
    }
}
