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
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedGuests, setSelectedGuests] = useState<string[]>([]);
    const [isUpdatingEncoding, setIsUpdatingEncoding] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEncodingModal, setShowEncodingModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [guestToDelete, setGuestToDelete] = useState<string | null>(null);
    const [pendingEncodingValue, setPendingEncodingValue] = useState(false);
    const [guestToEdit, setGuestToEdit] = useState<GuestWithWedding | null>(
        null
    );
    const [editFormData, setEditFormData] = useState({
        name: "",
        email: "",
        phone: "",
        maxGuests: 1,
        numberOfGuests: 0,
        isOnlyPemberkatan: false,
        eventType: "",
        notes: "",
    });

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
        // Filter by RSVP status
        if (filter !== "ALL" && guest.rsvpStatus !== filter) return false;
        
        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesName = guest.name.toLowerCase().includes(query);
            const matchesEmail = guest.email?.toLowerCase().includes(query);
            const matchesPhone = guest.phone?.toLowerCase().includes(query);
            const matchesNotes = guest.notes?.toLowerCase().includes(query);
            
            if (!matchesName && !matchesEmail && !matchesPhone && !matchesNotes) {
                return false;
            }
        }
        
        return true;
    });

    const handleEdit = (guest: GuestWithWedding) => {
        setGuestToEdit(guest);
        setEditFormData({
            name: guest.name,
            email: guest.email || "",
            phone: guest.phone || "",
            maxGuests: guest.maxGuests,
            numberOfGuests: guest.numberOfGuests,
            isOnlyPemberkatan: guest.isOnlyPemberkatan,
            eventType: guest.eventType || "",
            notes: guest.notes || "",
        });
        setShowEditModal(true);
    };

    const confirmEdit = async () => {
        if (!guestToEdit) return;

        try {
            const response = await fetch(`/api/guests/${guestToEdit.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editFormData),
            });

            if (!response.ok) throw new Error("Failed to update guest");

            toast.success("Guest updated successfully");
            setShowEditModal(false);
            setGuestToEdit(null);
            router.refresh();
        } catch (error) {
            console.error("Error updating guest:", error);
            toast.error("Failed to update guest");
        }
    };

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

        // Use short URL format with invitation code on invitation domain
        const invitationBaseUrl =
            process.env.NEXT_PUBLIC_INVITATION_URL ||
            "https://invitation.example.com";
        const invitationUrl = `${invitationBaseUrl}/i/${guest.invitationCode}`;

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

        // Replace invitationUrl with short URL
        let result = template.replace(/{invitationUrl}/g, invitationUrl);

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

            {/* Search Bar */}
            <div className="mb-4">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search guests by name, email, phone, or notes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                    <svg
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="flex flex-wrap gap-2">
                    {["ALL", "PENDING", "CONFIRMED", "DECLINED"].map(
                        (status) => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition text-sm ${
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
                        className="px-4 sm:px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition text-sm sm:text-base w-full sm:w-auto"
                    >
                        Copy {selectedGuests.length} Invitations
                    </button>
                )}
            </div>

            {filteredGuests.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                    No guests found
                </p>
            ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                            <table className="w-full bg-white">
                                <thead className="bg-gray-50">
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm">
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
                                        <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap">
                                    Name
                                </th>
                                <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap">
                                    Contact
                                </th>
                                <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap">
                                    Wedding
                                </th>
                                <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap">
                                    Max Guests
                                </th>
                                <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap">
                                    Actual Guests
                                </th>
                                <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap">
                                    Event Type
                                </th>
                                <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap">
                                    Status
                                </th>
                                <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap">
                                    Wishes/Notes
                                </th>
                                <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap">
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
                                    <td className="py-3 px-2 sm:px-4">
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
                                    <td className="py-3 px-2 sm:px-4">
                                        <div>
                                            <p className="font-medium text-gray-900 text-xs sm:text-sm">
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
                                    <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm">
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
                                    <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-600">
                                        {guest.wedding.name}
                                    </td>
                                    <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-600">
                                        {guest.maxGuests || 1}
                                        {guest.isOnlyPemberkatan && (
                                            <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded whitespace-nowrap">
                                                Pemberkatan Only
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-600">
                                        {guest.numberOfGuests || 0}
                                    </td>
                                    <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-600">
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
                                    <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-600 max-w-xs">
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
                                    <td className="py-3 px-2 sm:px-4">
                                        <div className="flex gap-1 sm:gap-2">
                                            <button
                                                onClick={() =>
                                                    handleCopyInvitation(guest)
                                                }
                                                className="text-green-600 hover:text-green-800 text-xs sm:text-sm font-medium whitespace-nowrap"
                                                title="Copy invitation text"
                                            >
                                                Copy
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleEdit(guest)
                                                }
                                                className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium whitespace-nowrap"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleDelete(guest.id)
                                                }
                                                className="text-red-600 hover:text-red-800 text-xs sm:text-sm font-medium whitespace-nowrap"
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
                    </div>
                </div>
            )}

            {/* Edit Guest Modal */}
            {showEditModal && guestToEdit && (
                <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Edit Guest
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Name *
                                </label>
                                <input
                                    type="text"
                                    value={editFormData.name}
                                    onChange={(e) =>
                                        setEditFormData({
                                            ...editFormData,
                                            name: e.target.value,
                                        })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Phone
                                    </label>
                                    <input
                                        type="text"
                                        value={editFormData.phone}
                                        onChange={(e) =>
                                            setEditFormData({
                                                ...editFormData,
                                                phone: e.target.value,
                                            })
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={editFormData.email}
                                        onChange={(e) =>
                                            setEditFormData({
                                                ...editFormData,
                                                email: e.target.value,
                                            })
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Max Guests
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={editFormData.maxGuests}
                                        onChange={(e) =>
                                            setEditFormData({
                                                ...editFormData,
                                                maxGuests: parseInt(
                                                    e.target.value
                                                ),
                                            })
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Actual Guests
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={editFormData.numberOfGuests}
                                        onChange={(e) =>
                                            setEditFormData({
                                                ...editFormData,
                                                numberOfGuests: parseInt(
                                                    e.target.value
                                                ),
                                            })
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Event Type
                                </label>
                                <select
                                    value={editFormData.eventType}
                                    onChange={(e) =>
                                        setEditFormData({
                                            ...editFormData,
                                            eventType: e.target.value,
                                        })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                >
                                    <option value="">Not specified</option>
                                    <option value="blessing-reception">
                                        Pemberkatan + Resepsi
                                    </option>
                                    <option value="reception-only">
                                        Resepsi Saja
                                    </option>
                                </select>
                            </div>
                            <div>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={editFormData.isOnlyPemberkatan}
                                        onChange={(e) =>
                                            setEditFormData({
                                                ...editFormData,
                                                isOnlyPemberkatan:
                                                    e.target.checked,
                                            })
                                        }
                                        className="rounded"
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        Pemberkatan Only (Hide reception option
                                        in invitation)
                                    </span>
                                </label>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notes / Wishes
                                </label>
                                <textarea
                                    value={editFormData.notes}
                                    onChange={(e) =>
                                        setEditFormData({
                                            ...editFormData,
                                            notes: e.target.value,
                                        })
                                    }
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end mt-6">
                            <button
                                onClick={() => {
                                    setShowEditModal(false);
                                    setGuestToEdit(null);
                                }}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmEdit}
                                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/*             ))}
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
