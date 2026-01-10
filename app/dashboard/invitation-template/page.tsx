import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { InvitationTemplateEditor } from "./InvitationTemplateEditor";
import { UserRole } from "@prisma/client";

export default async function InvitationTemplatePage() {
    const session = await auth();
    const isSuperAdmin =
        (session?.user as { role: UserRole })?.role === "SUPER_ADMIN";

    // Get user's weddings
    const weddings = await prisma.wedding.findMany({
        where: isSuperAdmin ? {} : { adminId: session!.user!.id as string },
        select: {
            id: true,
            name: true,
            slug: true,
        },
    });

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Invitation Template
                </h1>
                <p className="text-gray-600">
                    Customize the invitation text that will be copied for each
                    guest
                </p>
            </div>

            <InvitationTemplateEditor weddings={weddings} />
        </div>
    );
}
