"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Guest, Wedding, InvitationTemplate } from "@prisma/client";

type GuestWithWedding = Guest & {
    wedding: Pick<Wedding, "name" | "weddingDate" | "venue"> & {
        invitationTemplate: Pick<InvitationTemplate, "template"> | null;
    };
};

export function GuestList({ guests }: { guests: GuestWithWedding[] }) {
    const router = useRouter();
    const [filter, setFilter] = useState("ALL");
    const [selectedGuests, setSelectedGuests] = useState<string[]>([]);

    const filteredGuests = guests.filter((guest) => {
        if (filter === "ALL") return true;
        return guest.rsvpStatus === filter;
    });

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this guest?")) return;

        try {
            await fetch(`/api/guests/${id}`, { method: "DELETE" });
            router.refresh();
        } catch (error) {
            console.error("Error deleting guest:", error);
        }
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            await fetch(`/api/guests/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rsvpStatus: status }),
            });
            router.refresh();
        } catch (error) {
            console.error("Error updating guest:", error);
        }
    };

    const generateInvitationText = (guest: GuestWithWedding) => {
        const wedding = guest.wedding;
        const customTemplate = wedding.invitationTemplate?.template;

        // Default template if no custom template exists - using direct emoji characters
        const defaultTemplate = `Halo {guestName}! 👋

Kami dengan senang hati mengundang Anda untuk menghadiri pernikahan kami:

💑 {weddingName}
📅 {weddingDate}
📍 {venue}

Silakan konfirmasi kehadiran Anda melalui link berikut:
🔗 {invitationUrl}

Terima kasih! 🙏`;

        const template = customTemplate || defaultTemplate;

        // Replace placeholders
        return template
            .replace(/{guestName}/g, guest.name)
            .replace(/{guestNameEncoded}/g, encodeURIComponent(guest.name))
            .replace(
                /{invitationCode}/g,
                guest.invitationCode || "MISSING_CODE"
            )
            .replace(/{maxGuests}/g, String(guest.maxGuests || 1))
            .replace(
                /{isOnlyPemberkatan}/g,
                String(guest.isOnlyPemberkatan || false)
            )
            .replace(/{weddingName}/g, wedding.name)
            .replace(
                /{weddingDate}/g,
                new Date(wedding.weddingDate || "").toLocaleDateString(
                    "id-ID",
                    {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    }
                )
            )
            .replace(/{venue}/g, wedding.venue || "TBA")
            .replace(
                /{invitationUrl}/g,
                process.env.NEXT_PUBLIC_INVITATION_URL ||
                    "https://invitation.example.com"
            );
    };

    const handleCopyInvitation = (guest: GuestWithWedding) => {
        const invitationText = generateInvitationText(guest);
        navigator.clipboard
            .writeText(invitationText)
            .then(() => {
                alert(
                    `✅ Invitation text for ${guest.name} copied to clipboard!\n\nYou can now paste it to WhatsApp or any messaging app.`
                );
            })
            .catch(() => {
                alert("❌ Failed to copy invitation text");
            });
    };

    const handleBulkCopy = () => {
        if (selectedGuests.length === 0) {
            alert("Please select guests to copy invitations");
            return;
        }

        const invitationsText = filteredGuests
            .filter((g) => selectedGuests.includes(g.id))
            .map((guest) => {
                const text = generateInvitationText(guest);
                return `${
                    guest.phone ? `[${guest.phone}]` : "[No phone]"
                }\n${text}`;
            })
            .join("\n\n" + "=".repeat(50) + "\n\n");

        navigator.clipboard
            .writeText(invitationsText)
            .then(() => {
                alert(
                    `✅ ${selectedGuests.length} invitation texts copied!\n\nEach invitation is separated by a line. Copy and paste to each guest individually.`
                );
            })
            .catch(() => {
                alert("❌ Failed to copy invitation texts");
            });
    };

    const getWhatsAppLink = (guest: GuestWithWedding) => {
        if (!guest.phone) return "#";

        // Remove any non-digit characters and the leading +
        const phoneNumber = guest.phone.replace(/\D/g, "");

        // Generate invitation text
        const invitationText = generateInvitationText(guest);

        // Use api.whatsapp.com instead of wa.me to avoid emoji encoding issues during redirect
        // URLSearchParams handles UTF-8 encoding (including emojis) correctly
        const whatsappUrl = new URL("https://api.whatsapp.com/send");
        whatsappUrl.searchParams.append("phone", phoneNumber);
        whatsappUrl.searchParams.append("text", invitationText);

        return whatsappUrl.toString();
    };

    const toggleSelectGuest = (id: string) => {
        setSelectedGuests((prev) =>
            prev.includes(id) ? prev.filter((gid) => gid !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedGuests.length === filteredGuests.length) {
            setSelectedGuests([]);
        } else {
            setSelectedGuests(filteredGuests.map((g) => g.id));
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                    {["ALL", "PENDING", "CONFIRMED", "DECLINED"].map(
                        (status) => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-4 py-2 rounded-lg font-medium transition ${
                                    filter === status
                                        ? "bg-pink-600 text-white"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                            >
                                {status.replace("_", " ")}
                            </button>
                        )
                    )}
                </div>

                {selectedGuests.length > 0 && (
                    <button
                        onClick={handleBulkCopy}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
                    >
                        📋 Copy {selectedGuests.length} Invitations
                    </button>
                )}
            </div>

            {filteredGuests.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                    No guests found
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={
                                            selectedGuests.length ===
                                                filteredGuests.length &&
                                            filteredGuests.length > 0
                                        }
                                        onChange={toggleSelectAll}
                                        className="rounded"
                                    />
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                                    Name
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                                    Contact
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                                    Wedding
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                                    Max Guests
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                                    Actual Guests
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                                    Event Type
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                                    Status
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                                    Wishes/Notes
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredGuests.map((guest) => (
                                <tr
                                    key={guest.id}
                                    className="border-b border-gray-100 hover:bg-gray-50"
                                >
                                    <td className="py-3 px-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedGuests.includes(
                                                guest.id
                                            )}
                                            onChange={() =>
                                                toggleSelectGuest(guest.id)
                                            }
                                            className="rounded"
                                        />
                                    </td>
                                    <td className="py-3 px-4">
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {guest.name}
                                                {guest.invitationSent && (
                                                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                                        ✓ Sent
                                                    </span>
                                                )}
                                            </p>
                                            {guest.notes && (
                                                <p className="text-xs text-gray-500">
                                                    {guest.notes}
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-sm">
                                        {guest.phone && (
                                            <div className="inline-flex items-center gap-1">
                                                <a
                                                    href={getWhatsAppLink(
                                                        guest
                                                    )}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-green-600 hover:text-green-800 hover:underline inline-flex items-center gap-1"
                                                    title="Send invitation via WhatsApp"
                                                >
                                                    <span>
                                                        {guest.phone}
                                                    </span>
                                                    <svg
                                                        className="w-4 h-4"
                                                        fill="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                                    </svg>
                                                </a>
                                            </div>
                                        )}
                                        {guest.email && (
                                            <div className="text-gray-600">
                                                {guest.email}
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600">
                                        {guest.wedding.name}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600">
                                        {guest.maxGuests || 1}
                                        {guest.isOnlyPemberkatan && (
                                            <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                                                Pemberkatan Only
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600">
                                        {guest.numberOfGuests || 0}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600">
                                        {guest.eventType ? (
                                            <span
                                                className={`px-2 py-1 rounded text-xs ${
                                                    guest.eventType ===
                                                    "blessing-reception"
                                                        ? "bg-blue-100 text-blue-800"
                                                        : "bg-purple-100 text-purple-800"
                                                }`}
                                            >
                                                {guest.eventType ===
                                                "blessing-reception"
                                                    ? "Pemberkatan + Resepsi"
                                                    : "Resepsi Saja"}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">
                                                -
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4">
                                        <select
                                            value={guest.rsvpStatus}
                                            onChange={(e) =>
                                                handleUpdateStatus(
                                                    guest.id,
                                                    e.target.value
                                                )
                                            }
                                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                guest.rsvpStatus === "CONFIRMED"
                                                    ? "bg-green-100 text-green-800"
                                                    : guest.rsvpStatus ===
                                                      "DECLINED"
                                                    ? "bg-red-100 text-red-800"
                                                    : "bg-yellow-100 text-yellow-800"
                                            }`}
                                        >
                                            <option value="PENDING">
                                                PENDING
                                            </option>
                                            <option value="CONFIRMED">
                                                CONFIRMED
                                            </option>
                                            <option value="DECLINED">
                                                DECLINED
                                            </option>
                                        </select>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600 max-w-xs">
                                        {guest.notes ? (
                                            <div
                                                className="truncate"
                                                title={guest.notes}
                                            >
                                                {guest.notes}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">
                                                -
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() =>
                                                    handleCopyInvitation(guest)
                                                }
                                                className="text-green-600 hover:text-green-800 text-sm font-medium"
                                                title="Copy invitation text"
                                            >
                                                📋 Copy
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleDelete(guest.id)
                                                }
                                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
