import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Handle CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    });
}

// GET /api/short-url/[code] - Redirect short URL to full invitation URL
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        // Await params in Next.js 15+
        const { code } = await params;

        // Find guest by invitation code
        const guest = await prisma.guest.findUnique({
            where: { invitationCode: code },
            include: {
                wedding: {
                    select: {
                        encodeInvitationParams: true,
                    },
                },
            },
        });

        if (!guest) {
            const response = NextResponse.json(
                { error: "Invalid invitation code" },
                { status: 404 }
            );
            response.headers.set("Access-Control-Allow-Origin", "*");
            return response;
        }

        // Build full invitation URL
        const baseUrl =
            process.env.NEXT_PUBLIC_INVITATION_URL ||
            "https://invitation.example.com";
        let fullUrl = baseUrl;

        if (guest.wedding.encodeInvitationParams) {
            // Encode all params as base64 for privacy
            const params = {
                name: guest.name,
                maxGuests: guest.maxGuests || 1,
                isOnlyPemberkatan: guest.isOnlyPemberkatan || false,
                code: guest.invitationCode || "",
            };
            const encodedData = Buffer.from(JSON.stringify(params)).toString(
                "base64"
            );
            fullUrl = `${baseUrl}?data=${encodedData}`;
        } else {
            // Regular query params
            const params = new URLSearchParams({
                name: guest.name,
                maxGuests: String(guest.maxGuests || 1),
                isOnlyPemberkatan: String(guest.isOnlyPemberkatan || false),
                code: guest.invitationCode || "",
            });
            fullUrl = `${baseUrl}?${params.toString()}`;
        }

        // Always return JSON with redirect URL for fetch requests
        // This allows the invitation site to handle the redirect
        const response = NextResponse.json({
            redirectUrl: fullUrl,
            guest: {
                name: guest.name,
                maxGuests: guest.maxGuests,
                isOnlyPemberkatan: guest.isOnlyPemberkatan,
                code: guest.invitationCode,
            },
        });

        // Add CORS headers
        response.headers.set("Access-Control-Allow-Origin", "*");
        response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
        response.headers.set("Access-Control-Allow-Headers", "Content-Type");

        return response;
    } catch (error) {
        console.error("Error redirecting short URL:", error);
        const response = NextResponse.json(
            { error: "Failed to redirect" },
            { status: 500 }
        );
        response.headers.set("Access-Control-Allow-Origin", "*");
        return response;
    }
}
