"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Guest, Wedding, InvitationTemplate } from "@prisma/client";
import toast from "react-hot-toast";

type GuestWithWedding = Guest & {
    wedding: Pick<
        Wedding,
        "id" | "name" | "weddingDate" | "venue" | "encodeInvitationParams"
    > & {
        invitationTemplate: Pick<InvitationTemplate, "template"> | null;
    };
};

export function GuestList({ guests }: { guests: GuestWithWedding[] }) {
    const router = useRouter();
    const [filter, setFilter] = useState("ALL");
    const [selectedGuests, setSelectedGuests] = useState<string[]>([]);
    const [isUpdatingEncoding, setIsUpdatingEncoding] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEncodingModal, setShowEncodingModal] = useState(false);
    const [guestToDelete, setGuestToDelete] = useState<string | null>(null);
    const [pendingEncodingValue, setPendingEncodingValue] = useState(false);

    // Get unique wedding from guests (assuming all guests are from same wedding on this page)
    const wedding = guests[0]?.wedding;
    const weddingId = wedding?.id;

    const handleToggleEncoding = () => {
        if (!weddingId) return;
        const newValue = !wedding.encodeInvitationParams;
        setPendingEncodingValue(newValue);
        setShowEncodingModal(true);
    };

    const confirmToggleEncoding = async () => {
        setShowEncodingModal(false);
        setIsUpdatingEncoding(true);
        try {
            const response = await fetch(`/api/weddings/${weddingId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    encodeInvitationParams: pendingEncodingValue,
                }),
            });

            if (!response.ok)
                throw new Error("Failed to update encoding setting");

            router.refresh();
        } catch (error) {
            console.error("Error updating encoding setting:", error);
            toast.error("Failed to update encoding setting. Please try again.");
        } finally {
            setIsUpdatingEncoding(false);
        }
    };

    const filteredGuests = guests.filter((guest) => {
        if (filter === "ALL") return true;
        return guest.rsvpStatus === filter;
    });

    const handleDelete = (id: string) => {
        setGuestToDelete(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!guestToDelete) return;
        setShowDeleteModal(false);

        try {
            await fetch(`/api/guests/${guestToDelete}`, { method: "DELETE" });
            toast.success("Guest deleted successfully");
            router.refresh();
        } catch (error) {
            console.error("Error deleting guest:", error);
            toast.error("Failed to delete guest");
        } finally {
            setGuestToDelete(null);
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

        // Build invitation URL with encoding option
        const baseUrl =
            process.env.NEXT_PUBLIC_INVITATION_URL ||
            "https://invitation.example.com";

        let invitationUrl = baseUrl;

        if (wedding.encodeInvitationParams) {
            // Encode all params as base64 for privacy
            const params = {
                name: guest.name,
                maxGuests: guest.maxGuests || 1,
                isOnlyPemberkatan: guest.isOnlyPemberkatan || false,
                code: guest.invitationCode || "",
            };
            const encodedData = Buffer.from(JSON.stringify(params)).toString(
                "base64"
            );
            invitationUrl = `${baseUrl}?data=${encodedData}`;
        } else {
            // Regular query params
            const params = new URLSearchParams({
                name: guest.name,
                maxGuests: String(guest.maxGuests || 1),
                isOnlyPemberkatan: String(guest.isOnlyPemberkatan || false),
                code: guest.invitationCode || "",
            });
            invitationUrl = `${baseUrl}?${params.toString()}`;
        }

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

        // Replace invitationUrl first (this already includes all necessary params)
        let result = template.replace(/{invitationUrl}/g, invitationUrl);

        // Only replace individual parameter placeholders if they're NOT already part of invitationUrl
        // This prevents double parameters when template uses both {invitationUrl} and {name}, {maxGuests}, etc.
        if (!template.includes("{invitationUrl}")) {
            // Legacy template format - manually construct URL with params
            const params = new URLSearchParams({
                name: guest.name,
                maxGuests: String(guest.maxGuests || 1),
                isOnlyPemberkatan: String(guest.isOnlyPemberkatan || false),
                code: guest.invitationCode || "",
            });
            result = result.replace(
                /{baseUrl}/g,
                `${baseUrl}?${params.toString()}`
            );
        }

        // Replace other placeholders
        result = result
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
            .replace(/{venue}/g, wedding.venue || "TBA");

        return result;
    };

    const handleCopyInvitation = (guest: GuestWithWedding) => {
        const invitationText = generateInvitationText(guest);
        navigator.clipboard
            .writeText(invitationText)
            .then(() => {
                toast.success(
                    `Invitation for ${guest.name} copied to clipboard!`
                );
            })
            .catch(() => {
                toast.error("Failed to copy invitation text");
            });
    };

    const handleBulkCopy = () => {
        if (selectedGuests.length === 0) {
            toast.error("Please select guests to copy invitations");
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
                toast.success(
                    `${selectedGuests.length} invitation texts copied to clipboard!`
                );
            })
            .catch(() => {
                toast.error("Failed to copy invitation texts");
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
            {/* Encoding Toggle */}
            {wedding && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-gray-900 mb-1">
                                🔒 URL Parameter Encoding
                            </h3>
                            <p className="text-xs text-gray-600">
                                {wedding.encodeInvitationParams
                                    ? "Enabled: Guest info is encoded in invitation URLs for privacy"
                                    : "Disabled: Guest info is visible in invitation URLs"}
                            </p>
                        </div>
                        <button
                            onClick={handleToggleEncoding}
                            disabled={isUpdatingEncoding}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                wedding.encodeInvitationParams
                                    ? "bg-green-600"
                                    : "bg-gray-300"
                            } ${
                                isUpdatingEncoding
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    wedding.encodeInvitationParams
                                        ? "translate-x-6"
                                        : "translate-x-1"
                                }`}
                            />
                        </button>
                    </div>
                </div>
            )}

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
                                                    <span>{guest.phone}</span>
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

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Delete Guest
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete this guest? This
                            action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setGuestToDelete(null);
                                }}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Encoding Toggle Confirmation Modal */}
            {showEncodingModal && (
                <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {pendingEncodingValue
                                ? "Enable URL Encoding"
                                : "Disable URL Encoding"}
                        </h3>
                        <p className="text-gray-600 mb-6">
                            {pendingEncodingValue
                                ? "This will hide sensitive guest information in invitation links. URLs will use encoded parameters."
                                : "Guest information will be visible in invitation links. URLs will use plain query parameters."}
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowEncodingModal(false)}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmToggleEncoding}
                                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                            >
                                {pendingEncodingValue ? "Enable" : "Disable"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
