import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type SessionUser = {
    id?: string;
    role?: string;
};

// Helper to format phone number for WhatsApp
function formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, "");

    // If starts with 0, replace with country code (default: Indonesia 62)
    if (cleaned.startsWith("0")) {
        cleaned = "62" + cleaned.substring(1);
    }

    // Add @c.us suffix for WhatsApp
    return `${cleaned}@c.us`;
}

// Send WhatsApp message via WAHA following best practices to avoid spam detection
async function sendWhatsAppMessage(chatId: string, message: string) {
    const wahaUrl = process.env.WAHA_URL || "http://localhost:3001";
    const wahaSession = process.env.WAHA_SESSION || "default";
    const wahaApiKey = process.env.WAHA_API_KEY;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (wahaApiKey) {
        headers["X-Api-Key"] = wahaApiKey;
    }

    const basePayload = {
        session: wahaSession,
        chatId: chatId,
    };

    try {
        // Step 1: Send "seen" to mark conversation as read (human-like behavior)
        await fetch(`${wahaUrl}/api/sendSeen`, {
            method: "POST",
            headers,
            body: JSON.stringify(basePayload),
        });

        // Wait a bit after marking as seen (500ms - 1.5s)
        await new Promise((resolve) =>
            setTimeout(resolve, 500 + Math.random() * 1000)
        );

        // Step 2: Start typing indicator
        await fetch(`${wahaUrl}/api/startTyping`, {
            method: "POST",
            headers,
            body: JSON.stringify(basePayload),
        });

        // Step 3: Calculate typing delay based on message length (simulate human typing)
        // Average typing speed: 40-60 characters per second
        // For long messages, cap at reasonable time
        const baseDelay = 2000; // Minimum 2 seconds
        const typingSpeed = 50; // characters per second
        const calculatedDelay = (message.length / typingSpeed) * 1000;
        const maxDelay = 10000; // Maximum 10 seconds
        const typingDelay = Math.min(baseDelay + calculatedDelay, maxDelay);

        // Add randomness (±20%)
        const randomizedDelay = typingDelay * (0.8 + Math.random() * 0.4);

        await new Promise((resolve) => setTimeout(resolve, randomizedDelay));

        // Step 4: Stop typing indicator
        await fetch(`${wahaUrl}/api/stopTyping`, {
            method: "POST",
            headers,
            body: JSON.stringify(basePayload),
        });

        // Brief pause before sending (200-500ms)
        await new Promise((resolve) =>
            setTimeout(resolve, 200 + Math.random() * 300)
        );

        // Step 5: Send the actual message
        const response = await fetch(`${wahaUrl}/api/sendText`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                ...basePayload,
                text: message,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`WAHA API error: ${error}`);
        }

        return await response.json();
    } catch (error) {
        // If any step fails, still try to stop typing to clean up
        try {
            await fetch(`${wahaUrl}/api/stopTyping`, {
                method: "POST",
                headers,
                body: JSON.stringify(basePayload),
            });
        } catch {
            // Ignore cleanup errors
        }
        throw error;
    }
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

    const basePayload = {
        session: wahaSession,
        chatId: chatId,
    };

    try {
        // Step 1: Send seen
        await fetch(`${wahaUrl}/api/sendSeen`, {
            method: "POST",
            headers,
            body: JSON.stringify(basePayload),
        });

        await new Promise((resolve) =>
            setTimeout(resolve, 500 + Math.random() * 1000)
        );

        // Step 2: Start typing
        await fetch(`${wahaUrl}/api/startTyping`, {
            method: "POST",
            headers,
            body: JSON.stringify(basePayload),
        });

        // Wait a bit for image processing
        await new Promise((resolve) =>
            setTimeout(resolve, 2000 + Math.random() * 1000)
        );

        // Step 3: Stop typing
        await fetch(`${wahaUrl}/api/stopTyping`, {
            method: "POST",
            headers,
            body: JSON.stringify(basePayload),
        });

        await new Promise((resolve) =>
            setTimeout(resolve, 200 + Math.random() * 300)
        );

        // Step 4: Send image
        const response = await fetch(`${wahaUrl}/api/sendImage`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                ...basePayload,
                file: {
                    mimetype: "image/jpeg",
                    filename: "invitation.jpg",
                    data: imageUrl, // base64 or URL
                },
                caption: caption || "",
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`WAHA API error: ${error}`);
        }

        return await response.json();
    } catch (error) {
        // Cleanup
        try {
            await fetch(`${wahaUrl}/api/stopTyping`, {
                method: "POST",
                headers,
                body: JSON.stringify(basePayload),
            });
        } catch {
            // Ignore cleanup errors
        }
        throw error;
    }
}

// POST /api/whatsapp/send - Send invitation to specific guest
export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { guestId } = await request.json();

        // Get guest with wedding details and message template
        const guest = await prisma.guest.findUnique({
            where: { id: guestId },
            include: {
                wedding: {
                    include: {
                        messageTemplate: true,
                    },
                },
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

        // Create invitation URL
        const invitationUrl = `${
            process.env.AUTH_URL || "http://localhost:3000"
        }/invitation/${guest.wedding.slug}?guest=${encodeURIComponent(
            guest.name
        )}`;

        // Get message from template or use default
        let message = "";
        let imageUrl: string | null = null;

        if (
            guest.wedding.messageTemplate &&
            guest.wedding.messageTemplate.isActive
        ) {
            // Use custom template
            message = guest.wedding.messageTemplate.message;
            imageUrl = guest.wedding.messageTemplate.imageUrl;
        } else {
            // Use default template
            message = `✨ *WEDDING INVITATION* ✨

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
The Wedding Family 💐`;
        }

        // Replace placeholders
        message = message
            .replace(/{GUEST_NAME}/g, guest.name)
            .replace(/{GROOM_NAME}/g, guest.wedding.groomName)
            .replace(/{BRIDE_NAME}/g, guest.wedding.brideName)
            .replace(
                /{WEDDING_DATE}/g,
                new Date(guest.wedding.weddingDate).toLocaleDateString(
                    "id-ID",
                    {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                    }
                )
            )
            .replace(/{VENUE}/g, guest.wedding.venue)
            .replace(/{INVITATION_URL}/g, invitationUrl)
            .trim();

        // Send via WAHA (image first if exists, then text)
        let result;
        if (imageUrl) {
            // Try to send image with caption (requires WAHA Plus)
            try {
                result = await sendWhatsAppImage(chatId, imageUrl, message);
            } catch (error) {
                // If image sending fails (e.g., free version), fall back to text only
                console.warn(
                    "Image sending failed, falling back to text-only:",
                    error
                );
                result = await sendWhatsAppMessage(chatId, message);
            }
        } else {
            // Send text only
            result = await sendWhatsAppMessage(chatId, message);
        }

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
            message: "Invitation sent successfully",
            result,
        });
    } catch (error) {
        console.error("Error sending WhatsApp message:", error);
        return NextResponse.json(
            {
                error: "Failed to send message",
                details:
                    error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
