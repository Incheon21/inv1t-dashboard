import { compare } from "bcryptjs";
import { prisma } from "./prisma";

export async function verifyPassword(password: string, hashedPassword: string) {
    return await compare(password, hashedPassword);
}

export async function getUserByEmail(email: string) {
    return await prisma.user.findUnique({
        where: { email },
    });
}
