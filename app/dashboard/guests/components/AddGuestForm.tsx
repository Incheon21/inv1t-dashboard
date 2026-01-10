"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Wedding {
    id: string;
    name: string;
    slug: string;
}

export function AddGuestForm({ weddings }: { weddings: Wedding[] }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        weddingId: weddings[0]?.id || "",
        name: "",
        email: "",
        phone: "",
        numberOfGuests: 1,
        maxGuests: 1,
        isOnlyPemberkatan: false,
        notes: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch("/api/guests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                setFormData({
                    weddingId: weddings[0]?.id || "",
                    name: "",
                    email: "",
                    phone: "",
                    numberOfGuests: 1,
                    maxGuests: 1,
                    isOnlyPemberkatan: false,
                    notes: "",
                });
                router.refresh();
            }
        } catch (error) {
            console.error("Error adding guest:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {weddings.length > 1 && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Wedding
                    </label>
                    <select
                        value={formData.weddingId}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                weddingId: e.target.value,
                            })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                        required
                    >
                        {weddings.map((wedding) => (
                            <option key={wedding.id} value={wedding.id}>
                                {wedding.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                </label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                    required
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                    </label>
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                    </label>
                    <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                        placeholder="+62812..."
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Guests
                </label>
                <input
                    type="number"
                    min="1"
                    value={formData.numberOfGuests}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            numberOfGuests: parseInt(e.target.value),
                        })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Guests Allowed
                    </label>
                    <input
                        type="number"
                        min="1"
                        max="10"
                        value={formData.maxGuests}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                maxGuests: parseInt(e.target.value),
                            })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Maximum guests they can bring
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Invitation Type
                    </label>
                    <div className="flex items-center h-[42px]">
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isOnlyPemberkatan}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        isOnlyPemberkatan: e.target.checked,
                                    })
                                }
                                className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                                Pemberkatan Only
                            </span>
                        </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        Hide reception option
                    </p>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                </label>
                <textarea
                    value={formData.notes}
                    onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                    rows={3}
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition disabled:opacity-50"
            >
                {loading ? "Adding..." : "Add Guest"}
            </button>
        </form>
    );
}
