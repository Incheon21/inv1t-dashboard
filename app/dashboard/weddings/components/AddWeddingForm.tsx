"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Admin {
    id: string;
    name: string;
    email: string;
}

export function AddWeddingForm({ admins }: { admins: Admin[] }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        groomName: "",
        brideName: "",
        weddingDate: "",
        venue: "",
        description: "",
        adminId: admins[0]?.id || "",
    });

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
    };

    const handleNameChange = (name: string) => {
        setFormData({
            ...formData,
            name,
            slug: generateSlug(name),
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch("/api/weddings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                setFormData({
                    name: "",
                    slug: "",
                    groomName: "",
                    brideName: "",
                    weddingDate: "",
                    venue: "",
                    description: "",
                    adminId: admins[0]?.id || "",
                });
                router.refresh();
            }
        } catch (error) {
            console.error("Error adding wedding:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Wedding Name *
                </label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                    placeholder="John & Jane"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL Slug *
                </label>
                <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) =>
                        setFormData({ ...formData, slug: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                    placeholder="john-jane"
                    required
                />
                <p className="text-xs text-gray-500 mt-1">
                    Used in invitation URL: {formData.slug || "wedding"}
                    .wedding.com
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Groom Name *
                    </label>
                    <input
                        type="text"
                        value={formData.groomName}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                groomName: e.target.value,
                            })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bride Name *
                    </label>
                    <input
                        type="text"
                        value={formData.brideName}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                brideName: e.target.value,
                            })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                        required
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Wedding Date *
                </label>
                <input
                    type="date"
                    value={formData.weddingDate}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            weddingDate: e.target.value,
                        })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Venue *
                </label>
                <input
                    type="text"
                    value={formData.venue}
                    onChange={(e) =>
                        setFormData({ ...formData, venue: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                    placeholder="Grand Ballroom, Jakarta"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                </label>
                <textarea
                    value={formData.description}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            description: e.target.value,
                        })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                    rows={3}
                    placeholder="Join us in celebrating our special day!"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign to Admin *
                </label>
                <select
                    value={formData.adminId}
                    onChange={(e) =>
                        setFormData({ ...formData, adminId: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                    required
                >
                    {admins.map((admin) => (
                        <option key={admin.id} value={admin.id}>
                            {admin.name} ({admin.email})
                        </option>
                    ))}
                </select>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition disabled:opacity-50"
            >
                {loading ? "Creating..." : "Create Wedding"}
            </button>
        </form>
    );
}
