"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type MessageTemplate = {
    id?: string;
    weddingId: string;
    name: string;
    message: string;
    imageUrl: string | null;
    isActive: boolean;
};

export default function MessageTemplateEditor() {
    const router = useRouter();
    const [template, setTemplate] = useState<MessageTemplate | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [imageUploading, setImageUploading] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    useEffect(() => {
        fetchTemplate();
    }, []);

    const fetchTemplate = async () => {
        try {
            const response = await fetch("/api/message-template");
            if (response.ok) {
                const data = await response.json();
                setTemplate(data);
                setPreviewImage(data.imageUrl);
            } else {
                const error = await response.json();
                console.error("Failed to fetch template:", error);
                alert(`Error: ${error.error || "Failed to load template"}`);
            }
        } catch (error) {
            console.error("Error fetching template:", error);
            alert("Failed to load template. Please refresh the page.");
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
            alert("Please upload an image file");
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert("Image size should be less than 5MB");
            return;
        }

        setImageUploading(true);

        try {
            // Convert to base64 for preview
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setPreviewImage(base64String);
                if (template) {
                    setTemplate({ ...template, imageUrl: base64String });
                }
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("Failed to upload image");
        } finally {
            setImageUploading(false);
        }
    };

    const handleRemoveImage = () => {
        setPreviewImage(null);
        if (template) {
            setTemplate({ ...template, imageUrl: null });
        }
    };

    const handleSave = async () => {
        if (!template) return;

        // Check if wedding exists
        if (!template.weddingId || (template as any).noWedding) {
            alert(
                "Please create a wedding first before saving the message template."
            );
            return;
        }

        setSaving(true);
        try {
            const response = await fetch("/api/message-template", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(template),
            });

            if (response.ok) {
                alert("Message template saved successfully!");
                router.refresh();
            } else {
                const error = await response.json();
                alert(`Failed to save template: ${error.error}`);
            }
        } catch (error) {
            console.error("Error saving template:", error);
            alert("Failed to save template");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading template...</div>
            </div>
        );
    }

    if (!template) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-red-500">Failed to load template</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Warning if no wedding */}
            {template.weddingId === null || (template as any).noWedding ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div>
                            <h3 className="font-semibold text-yellow-800">
                                No Wedding Found
                            </h3>
                            <p className="text-sm text-yellow-700 mt-1">
                                You need to create a wedding first before you
                                can save a message template.{" "}
                                <a
                                    href="/dashboard/weddings"
                                    className="underline font-medium"
                                >
                                    Go to Weddings
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            ) : null}

            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">
                    WhatsApp Message Template
                </h2>

                <div className="space-y-4">
                    {/* Template Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Template Name
                        </label>
                        <input
                            type="text"
                            value={template.name}
                            onChange={(e) =>
                                setTemplate({
                                    ...template,
                                    name: e.target.value,
                                })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Wedding Invitation"
                        />
                    </div>

                    {/* Message Template */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Message Template
                        </label>
                        <div className="mb-2 text-xs text-gray-500">
                            <strong>Available placeholders:</strong>
                            <div className="mt-1 space-x-2">
                                <code className="bg-gray-100 px-1 py-0.5 rounded">
                                    {"{GUEST_NAME}"}
                                </code>
                                <code className="bg-gray-100 px-1 py-0.5 rounded">
                                    {"{GROOM_NAME}"}
                                </code>
                                <code className="bg-gray-100 px-1 py-0.5 rounded">
                                    {"{BRIDE_NAME}"}
                                </code>
                                <code className="bg-gray-100 px-1 py-0.5 rounded">
                                    {"{WEDDING_DATE}"}
                                </code>
                                <code className="bg-gray-100 px-1 py-0.5 rounded">
                                    {"{VENUE}"}
                                </code>
                                <code className="bg-gray-100 px-1 py-0.5 rounded">
                                    {"{INVITATION_URL}"}
                                </code>
                            </div>
                        </div>
                        <textarea
                            value={template.message}
                            onChange={(e) =>
                                setTemplate({
                                    ...template,
                                    message: e.target.value,
                                })
                            }
                            rows={15}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            placeholder="Enter your message template here..."
                        />
                        <div className="mt-1 text-xs text-gray-500">
                            Characters: {template.message.length}
                        </div>
                    </div>

                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Image Attachment (Optional)
                        </label>
                        <div className="mb-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                            <p className="text-xs text-yellow-800">
                                <strong>⚠️ Note:</strong> Image sending requires
                                WAHA Plus version. With the free version, only
                                text messages will be sent.{" "}
                                <a
                                    href="https://waha.devlike.pro/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline"
                                >
                                    Learn more
                                </a>
                            </p>
                        </div>
                        {previewImage ? (
                            <div className="space-y-2">
                                <div className="relative inline-block">
                                    <img
                                        src={previewImage}
                                        alt="Preview"
                                        className="max-w-xs rounded-lg border border-gray-300"
                                    />
                                    <button
                                        onClick={handleRemoveImage}
                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                    >
                                        <svg
                                            className="w-4 h-4"
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
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label className="cursor-pointer inline-block">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                        disabled={imageUploading}
                                    />
                                    <div className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors">
                                        {imageUploading
                                            ? "Uploading..."
                                            : "Choose Image"}
                                    </div>
                                </label>
                                <p className="mt-1 text-xs text-gray-500">
                                    Max size: 5MB. Supported: JPG, PNG, GIF
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Save Button */}
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={handleSave}
                            disabled={saving || !template.message}
                            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            {saving ? "Saving..." : "Save Template"}
                        </button>
                        <button
                            onClick={() => router.push("/dashboard/guests")}
                            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview Section */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Preview</h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="whitespace-pre-wrap font-sans text-sm">
                        {template.message
                            .replace(/{GUEST_NAME}/g, "John Doe")
                            .replace(/{GROOM_NAME}/g, "Ivan")
                            .replace(/{BRIDE_NAME}/g, "Olivia")
                            .replace(
                                /{WEDDING_DATE}/g,
                                new Date().toLocaleDateString("id-ID", {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                })
                            )
                            .replace(/{VENUE}/g, "Grand Ballroom")
                            .replace(
                                /{INVITATION_URL}/g,
                                "https://example.com/invitation/ivan-olivia"
                            )}
                    </div>
                    {previewImage && (
                        <div className="mt-4">
                            <img
                                src={previewImage}
                                alt="Message attachment"
                                className="max-w-xs rounded-lg"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
