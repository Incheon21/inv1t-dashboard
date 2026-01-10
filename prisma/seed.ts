import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

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
    console.log("🌱 Seeding database...");

    // Create super admin
    const superAdminPassword = await hash("superadmin123", 10);
    const superAdmin = await prisma.user.upsert({
        where: { email: "superadmin@wedding.com" },
        update: {},
        create: {
            email: "superadmin@wedding.com",
            name: "Super Admin",
            password: superAdminPassword,
            role: "SUPER_ADMIN",
        },
    });

    console.log("✅ Created super admin:", superAdmin.email);

    // Create admin for Ivan & Olivia
    const adminPassword = await hash("admin123", 10);
    const admin = await prisma.user.upsert({
        where: { email: "ivan@wedding.com" },
        update: {},
        create: {
            email: "ivan@wedding.com",
            name: "Ivan",
            password: adminPassword,
            role: "ADMIN",
        },
    });

    console.log("✅ Created admin:", admin.email);

    // Create wedding
    const wedding = await prisma.wedding.upsert({
        where: { slug: "ivan-olivia" },
        update: {},
        create: {
            name: "Ivan & Olivia",
            slug: "ivan-olivia",
            groomName: "Ivan",
            brideName: "Olivia",
            weddingDate: new Date("2026-06-15"),
            venue: "Grand Ballroom, Jakarta",
            description: "Join us in celebrating our special day!",
            adminId: admin.id,
        },
    });

    console.log("✅ Created wedding:", wedding.name);

    // Create default invitation template
    const invitationTemplate = await prisma.invitationTemplate.upsert({
        where: { weddingId: wedding.id },
        update: {},
        create: {
            weddingId: wedding.id,
            template: `Halo {guestName}! 👋

Kami dengan senang hati mengundang Anda untuk menghadiri pernikahan kami:

💑 {weddingName}
📅 {weddingDate}
📍 {venue}

Silakan konfirmasi kehadiran Anda melalui link berikut:
🔗 {invitationUrl}?name={guestNameEncoded}&maxGuests={maxGuests}&isOnlyPemberkatan={isOnlyPemberkatan}&code={invitationCode}

Terima kasih! 🙏`,
        },
    });

    console.log("✅ Created invitation template");

    // Create sample guests with unique invitation codes
    const sampleGuests = [
        {
            name: "John Doe",
            email: "john@example.com",
            phone: "+6281234567890",
            numberOfGuests: 1,
            maxGuests: 2,
            isOnlyPemberkatan: false,
            notes: "VIP Guest",
            weddingId: wedding.id,
            invitationCode: generateInvitationCode(),
        },
        {
            name: "Jane Smith",
            email: "jane@example.com",
            phone: "+6281234567891",
            numberOfGuests: 1,
            maxGuests: 1,
            isOnlyPemberkatan: true,
            weddingId: wedding.id,
            invitationCode: generateInvitationCode(),
        },
        {
            name: "Bob Johnson",
            phone: "+6281234567892",
            numberOfGuests: 1,
            maxGuests: 4,
            isOnlyPemberkatan: false,
            notes: "Family friend",
            weddingId: wedding.id,
            invitationCode: generateInvitationCode(),
        },
    ];

    for (const guest of sampleGuests) {
        await prisma.guest.upsert({
            where: {
                weddingId_phone: {
                    weddingId: guest.weddingId,
                    phone: guest.phone,
                },
            },
            update: {
                invitationCode: guest.invitationCode,
                maxGuests: guest.maxGuests,
                isOnlyPemberkatan: guest.isOnlyPemberkatan,
            },
            create: guest,
        });
    }

    console.log("✅ Created sample guests");

    console.log("\n🎉 Seeding completed!");
    console.log("\nDefault accounts:");
    console.log("Super Admin: superadmin@wedding.com / superadmin123");
    console.log("Admin: ivan@wedding.com / admin123");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
