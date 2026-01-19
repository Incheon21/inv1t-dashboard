"use client";

import { useState, useEffect } from "react";

interface Wedding {
    id: string;
    name: string;
    slug: string;
}

export function InvitationTemplateEditor({
    weddings,
}: {
    weddings: Wedding[];
}) {
    const [selectedWedding, setSelectedWedding] = useState(
        weddings[0]?.id || "",
    );
    const [template, setTemplate] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    const loadTemplate = async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `/api/invitation-template?weddingId=${selectedWedding}`,
            );
            const data = await response.json();
            setTemplate(data.template || "");
        } catch (error) {
            console.error("Error loading template:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedWedding) {
            loadTemplate();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedWedding]);

    const handleSave = async () => {
        setSaving(true);
        setMessage("");
        try {
            const response = await fetch("/api/invitation-template", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    weddingId: selectedWedding,
                    template,
                }),
            });

            if (response.ok) {
                setMessage("✅ Template saved successfully!");
                setTimeout(() => setMessage(""), 3000);
            } else {
                setMessage("❌ Failed to save template");
            }
        } catch (error) {
            console.error("Error saving template:", error);
            setMessage("❌ Failed to save template");
        } finally {
            setSaving(false);
        }
    };

    const insertPlaceholder = (placeholder: string) => {
        setTemplate((prev) => prev + placeholder);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
            {weddings.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                    No weddings found. Please create a wedding first.
                </p>
            ) : (
                <>
                    {/* Wedding Selector */}
                    {weddings.length > 1 && (
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Wedding
                            </label>
                            <select
                                value={selectedWedding}
                                onChange={(e) =>
                                    setSelectedWedding(e.target.value)
                                }
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                            >
                                {weddings.map((wedding) => (
                                    <option key={wedding.id} value={wedding.id}>
                                        {wedding.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Placeholders Guide */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold text-gray-900 mb-2">
                            Available Placeholders:
                        </h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <button
                                onClick={() => insertPlaceholder("{guestName}")}
                                className="text-left px-3 py-2 bg-white rounded hover:bg-gray-100 transition"
                            >
                                <code className="text-gray-900">
                                    {"{guestName}"}
                                </code>{" "}
                                - Guest name
                            </button>
                            <button
                                onClick={() =>
                                    insertPlaceholder("{invitationCode}")
                                }
                                className="text-left px-3 py-2 bg-white rounded hover:bg-gray-100 transition"
                            >
                                <code className="text-gray-900">
                                    {"{invitationCode}"}
                                </code>{" "}
                                - Unique code
                            </button>
                            <button
                                onClick={() =>
                                    insertPlaceholder("{guestNameEncoded}")
                                }
                                className="text-left px-3 py-2 bg-white rounded hover:bg-gray-100 transition"
                            >
                                <code className="text-gray-900">
                                    {"{guestNameEncoded}"}
                                </code>{" "}
                                - Guest name (URL)
                            </button>
                            <button
                                onClick={() =>
                                    insertPlaceholder("{weddingName}")
                                }
                                className="text-left px-3 py-2 bg-white rounded hover:bg-gray-100 transition"
                            >
                                <code className="text-gray-900">
                                    {"{weddingName}"}
                                </code>{" "}
                                - Wedding names
                            </button>
                            <button
                                onClick={() => insertPlaceholder("{maxGuests}")}
                                className="text-left px-3 py-2 bg-white rounded hover:bg-gray-100 transition"
                            >
                                <code className="text-gray-900">
                                    {"{maxGuests}"}
                                </code>{" "}
                                - Max guests
                            </button>
                            <button
                                onClick={() =>
                                    insertPlaceholder("{isOnlyPemberkatan}")
                                }
                                className="text-left px-3 py-2 bg-white rounded hover:bg-gray-100 transition"
                            >
                                <code className="text-gray-900">
                                    {"{isOnlyPemberkatan}"}
                                </code>{" "}
                                - Pemberkatan only
                            </button>
                            <button
                                onClick={() =>
                                    insertPlaceholder("{weddingDate}")
                                }
                                className="text-left px-3 py-2 bg-white rounded hover:bg-gray-100 transition"
                            >
                                <code className="text-gray-900">
                                    {"{weddingDate}"}
                                </code>{" "}
                                - Wedding date
                            </button>
                            <button
                                onClick={() => insertPlaceholder("{venue}")}
                                className="text-left px-3 py-2 bg-white rounded hover:bg-gray-100 transition"
                            >
                                <code className="text-gray-900">
                                    {"{venue}"}
                                </code>{" "}
                                - Venue location
                            </button>
                            <button
                                onClick={() =>
                                    insertPlaceholder("{invitationUrl}")
                                }
                                className="text-left px-3 py-2 bg-white rounded hover:bg-gray-100 transition col-span-2"
                            >
                                <code className="text-gray-900">
                                    {"{invitationUrl}"}
                                </code>{" "}
                                - Invitation website link
                            </button>
                        </div>
                    </div>

                    {/* Template Editor */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Invitation Template
                        </label>
                        {loading ? (
                            <div className="text-center py-8 text-gray-500">
                                Loading template...
                            </div>
                        ) : (
                            <textarea
                                value={template}
                                onChange={(e) => setTemplate(e.target.value)}
                                rows={12}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none font-mono text-sm"
                                placeholder="Enter your invitation template..."
                            />
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                            Click placeholders above to insert them into your
                            template
                        </p>
                    </div>

                    {/* Save Button */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={handleSave}
                            disabled={saving || loading}
                            className="px-6 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50"
                        >
                            {saving ? "Saving..." : "Save Template"}
                        </button>

                        {message && (
                            <span
                                className={`text-sm font-medium ${
                                    message.startsWith("✅")
                                        ? "text-gray-900"
                                        : "text-gray-900"
                                }`}
                            >
                                {message}
                            </span>
                        )}
                    </div>

                    {/* Preview */}
                    {template && (
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                            <h3 className="font-semibold text-gray-900 mb-2">
                                Preview:
                            </h3>
                            <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                {template
                                    .replace("{guestName}", "John Doe")
                                    .replace("{guestNameEncoded}", "John%20Doe")
                                    .replace("{invitationCode}", "clxyz12345")
                                    .replace("{maxGuests}", "2")
                                    .replace("{isOnlyPemberkatan}", "false")
                                    .replace(
                                        "{weddingName}",
                                        weddings.find(
                                            (w) => w.id === selectedWedding,
                                        )?.name || "Wedding",
                                    )
                                    .replace(
                                        "{weddingDate}",
                                        "Saturday, 15 June 2026",
                                    )
                                    .replace(
                                        "{venue}",
                                        "Grand Ballroom, Jakarta",
                                    )
                                    .replace(
                                        "{invitationUrl}",
                                        "https://invitation.example.com",
                                    )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
