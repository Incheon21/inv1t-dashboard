"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { UserRole } from "@prisma/client";

interface SidebarProps {
    user: {
        name?: string | null;
        email?: string | null;
        role?: UserRole;
    };
}

export function Sidebar({ user }: SidebarProps) {
    const pathname = usePathname();
    const isSuperAdmin = user.role === "SUPER_ADMIN";

    const navigation = [
        { name: "Dashboard", href: "/dashboard", icon: "📊" },
        { name: "Guests", href: "/dashboard/guests", icon: "👥" },
        {
            name: "Invitation Template",
            href: "/dashboard/invitation-template",
            icon: "📝",
        },
        ...(isSuperAdmin
            ? [
                  { name: "Weddings", href: "/dashboard/weddings", icon: "💒" },
                  { name: "Users", href: "/dashboard/users", icon: "👤" },
              ]
            : []),
    ];

    return (
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-6 border-b border-gray-200">
                <h1 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    Wedding Admin
                </h1>
                <p className="text-sm text-gray-600 mt-1">{user.name}</p>
                <p className="text-xs text-gray-400">
                    {user.role?.replace("_", " ") || "ADMIN"}
                </p>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                                isActive
                                    ? "bg-pink-50 text-pink-600 font-medium"
                                    : "text-gray-700 hover:bg-gray-50"
                            }`}
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-200">
                <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                    <span className="text-xl">🚪</span>
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );
}
