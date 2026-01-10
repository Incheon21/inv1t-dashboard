import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type SessionUser = {
    id?: string;
    role?: string;
};

// Helper to format phone number for WhatsApp
function formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("0")) {
        cleaned = "62" + cleaned.substring(1);
    }
    return `${cleaned}@c.us`;
}

// Send WhatsApp image via WAHA
async function sendWhatsAppImage(
    chatId: string,
    imageUrl: string,
    caption?: string
) {
    const wahaUrl = process.env.WAHA_URL || "http://localhost:3001";
    const wahaSession = process.env.WAHA_SESSION || "default";
    const wahaApiKey = process.env.WAHA_API_KEY;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (wahaApiKey) {
        headers["X-Api-Key"] = wahaApiKey;
    }

    const body: {
        session: string;
        chatId: string;
        file: { url: string };
        caption?: string;
    } = {
        session: wahaSession,
        chatId: chatId,
        file: {
            url: imageUrl,
        },
    };

    if (caption) {
        body.caption = caption;
    }

    const response = await fetch(`${wahaUrl}/api/sendImage`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`WAHA API error: ${error}`);
    }

    return await response.json();
}

// POST /api/whatsapp/send-image - Send image invitation
export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { guestId, imageUrl, caption } = await request.json();

        if (!imageUrl) {
            return NextResponse.json(
                { error: "Image URL is required" },
                { status: 400 }
            );
        }

        // Get guest with wedding details
        const guest = await prisma.guest.findUnique({
            where: { id: guestId },
            include: {
                wedding: true,
            },
        });

        if (!guest) {
            return NextResponse.json(
                { error: "Guest not found" },
                { status: 404 }
            );
        }

        // Check if user has access to this wedding
        const isSuperAdmin =
            (session.user as SessionUser).role === "SUPER_ADMIN";
        if (!isSuperAdmin && guest.wedding.adminId !== session.user?.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Check if guest has phone number
        if (!guest.phone) {
            return NextResponse.json(
                { error: "Guest has no phone number" },
                { status: 400 }
            );
        }

        // Format phone number for WhatsApp
        const chatId = formatPhoneNumber(guest.phone);

        // Create caption with invitation details
        const invitationUrl = `${
            process.env.AUTH_URL || "http://localhost:3000"
        }/invitation/${guest.wedding.slug}?guest=${encodeURIComponent(
            guest.name
        )}`;

        const defaultCaption = `
✨ *WEDDING INVITATION* ✨

Dear *${guest.name}*,

You are cordially invited to celebrate:
*${guest.wedding.groomName}* 💍 *${guest.wedding.brideName}*

📅 ${new Date(guest.wedding.weddingDate).toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
        })}

📍 ${guest.wedding.venue}

🔗 RSVP: ${invitationUrl}
        `.trim();

        // Send via WAHA
        const result = await sendWhatsAppImage(
            chatId,
            imageUrl,
            caption || defaultCaption
        );

        // Update guest record
        await prisma.guest.update({
            where: { id: guestId },
            data: {
                invitationSent: true,
                invitationSentAt: new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            message: "Image invitation sent successfully",
            result,
        });
    } catch (error) {
        console.error("Error sending WhatsApp image:", error);
        return NextResponse.json(
            {
                error: "Failed to send image",
                details:
                    error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
