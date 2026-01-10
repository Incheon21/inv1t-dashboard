import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const weddings = await prisma.wedding.findMany({
        select: {
            id: true,
            slug: true,
            name: true,
        },
    });

    console.log("Weddings in database:");
    console.log(JSON.stringify(weddings, null, 2));

    const wedding = await prisma.wedding.findUnique({
        where: { slug: "ivan-olivia" },
    });

    console.log("\nWedding with slug 'ivan-olivia':");
    console.log(wedding ? "✅ FOUND" : "❌ NOT FOUND");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
