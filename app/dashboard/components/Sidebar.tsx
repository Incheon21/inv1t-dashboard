"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { UserRole } from "@prisma/client";
import { useState } from "react";

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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
        <>
            {/* Mobile hamburger button */}
            <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
            >
                <svg
                    className="w-6 h-6 text-gray-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    {isMobileMenuOpen ? (
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                        />
                    ) : (
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6h16M4 12h16M4 18h16"
                        />
                    )}
                </svg>
            </button>

            {/* Mobile overlay */}
            {isMobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-30"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div
                className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out ${
                    isMobileMenuOpen
                        ? "translate-x-0"
                        : "-translate-x-full lg:translate-x-0"
                }`}
            >
                <div className="p-6 border-b border-gray-200">
                    <h1 className="text-xl font-bold text-gray-900">
                        Wedding Admin
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">{user.name}</p>
                    <p className="text-xs text-gray-500">
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
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                                    isActive
                                        ? "bg-gray-900 text-white font-medium"
                                        : "text-gray-700 hover:bg-gray-100"
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
                        className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                    >
                        <span className="text-xl">🚪</span>
                        <span>Logout</span>
                    </button>
                </div>
            </div>
        </>
    );
}
