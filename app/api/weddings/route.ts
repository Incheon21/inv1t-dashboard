import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const data = await request.json();
        const {
            name,
            slug,
            groomName,
            brideName,
            weddingDate,
            venue,
            description,
            adminId,
        } = data;

        const wedding = await prisma.wedding.create({
            data: {
                name,
                slug,
                groomName,
                brideName,
                weddingDate: new Date(weddingDate),
                venue,
                description: description || null,
                adminId,
            },
        });

        return NextResponse.json(wedding);
    } catch (error) {
        console.error("Error creating wedding:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
