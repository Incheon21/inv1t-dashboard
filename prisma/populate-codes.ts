import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Function to generate unique invitation code
function generateInvitationCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 10; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

async function main() {
    console.log("🔑 Populating invitation codes...");

    const guests = await prisma.guest.findMany({
        where: {
            invitationCode: null,
        },
    });

    console.log(`Found ${guests.length} guests without invitation codes`);

    for (const guest of guests) {
        const code = generateInvitationCode();
        await prisma.guest.update({
            where: { id: guest.id },
            data: {
                invitationCode: code,
            },
        });
        console.log(`✅ Generated code ${code} for ${guest.name}`);
    }

    console.log(`\n✅ All ${guests.length} guests now have invitation codes`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
