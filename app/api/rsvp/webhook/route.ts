import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RSVPStatus } from "@prisma/client";

// CORS headers
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

// Webhook to receive RSVP updates from the wedding invitation site
export async function POST(request: NextRequest) {
    try {
        const { weddingSlug, guestData, apiKey } = await request.json();

        // Validate API key (add this to your .env)
        if (apiKey !== process.env.RSVP_WEBHOOK_SECRET) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401, headers: corsHeaders }
            );
        }

        // Find the wedding
        const wedding = await prisma.wedding.findUnique({
            where: { slug: weddingSlug },
        });

        if (!wedding) {
            return NextResponse.json(
                { error: "Wedding not found" },
                { status: 404, headers: corsHeaders }
            );
        }

        // Find guest by invitation code (most secure)
        let guest;

        if (guestData.invitationCode) {
            guest = await prisma.guest.findUnique({
                where: {
                    invitationCode: guestData.invitationCode,
                },
            });

            if (!guest) {
                return NextResponse.json(
                    { error: "Invalid invitation code" },
                    { status: 404, headers: corsHeaders }
                );
            }

            // Verify the guest belongs to this wedding
            if (guest.weddingId !== wedding.id) {
                return NextResponse.json(
                    { error: "Invitation code not valid for this wedding" },
                    { status: 403, headers: corsHeaders }
                );
            }

            // Update guest RSVP
            guest = await prisma.guest.update({
                where: { id: guest.id },
                data: {
                    email: guestData.email || guest.email,
                    rsvpStatus: guestData.isAttending
                        ? RSVPStatus.CONFIRMED
                        : RSVPStatus.DECLINED,
                    numberOfGuests: guestData.numberOfGuests || 1,
                    eventType: guestData.eventType || guest.eventType,
                    notes: guestData.message || guest.notes,
                    rsvpAt: new Date(),
                },
            });
        } else {
            // Fallback: Try to find by phone or name (for backward compatibility)
            // This is less secure and should be deprecated
            if (guestData.phone) {
                guest = await prisma.guest.upsert({
                    where: {
                        weddingId_phone: {
                            weddingId: wedding.id,
                            phone: guestData.phone,
                        },
                    },
                    update: {
                        name: guestData.name,
                        email: guestData.email || null,
                        rsvpStatus: guestData.isAttending
                            ? RSVPStatus.CONFIRMED
                            : RSVPStatus.DECLINED,
                        numberOfGuests: guestData.numberOfGuests || 1,
                        eventType: guestData.eventType || null,
                        notes: guestData.message || null,
                        rsvpAt: new Date(),
                    },
                    create: {
                        weddingId: wedding.id,
                        name: guestData.name,
                        email: guestData.email || null,
                        phone: guestData.phone,
                        rsvpStatus: guestData.isAttending
                            ? RSVPStatus.CONFIRMED
                            : RSVPStatus.DECLINED,
                        numberOfGuests: guestData.numberOfGuests || 1,
                        eventType: guestData.eventType || null,
                        notes: guestData.message || null,
                        rsvpAt: new Date(),
                    },
                });
            } else {
                // Find by name (least secure)
                const existingGuest = await prisma.guest.findFirst({
                    where: {
                        weddingId: wedding.id,
                        name: guestData.name,
                    },
                });

                if (existingGuest) {
                    guest = await prisma.guest.update({
                        where: { id: existingGuest.id },
                        data: {
                            email: guestData.email || existingGuest.email,
                            rsvpStatus: guestData.isAttending
                                ? RSVPStatus.CONFIRMED
                                : RSVPStatus.DECLINED,
                            numberOfGuests: guestData.numberOfGuests || 1,
                            eventType:
                                guestData.eventType || existingGuest.eventType,
                            notes: guestData.message || existingGuest.notes,
                            rsvpAt: new Date(),
                        },
                    });
                } else {
                    // Create new guest (not recommended - uninvited guest)
                    guest = await prisma.guest.create({
                        data: {
                            weddingId: wedding.id,
                            name: guestData.name,
                            email: guestData.email || null,
                            phone: null,
                            rsvpStatus: guestData.isAttending
                                ? RSVPStatus.CONFIRMED
                                : RSVPStatus.DECLINED,
                            numberOfGuests: guestData.numberOfGuests || 1,
                            eventType: guestData.eventType || null,
                            notes: guestData.message || null,
                            rsvpAt: new Date(),
                        },
                    });
                }
            }
        }

        return NextResponse.json(
            { success: true, guest },
            { headers: corsHeaders }
        );
    } catch (error) {
        console.error("RSVP webhook error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500, headers: corsHeaders }
        );
    }
}
