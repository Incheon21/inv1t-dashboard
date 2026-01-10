"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";

interface CSVRow {
    [key: string]: string;
}

interface Wedding {
    id: string;
    name: string;
    slug: string;
}

export function CSVUpload({ weddings }: { weddings: Wedding[] }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [weddingId, setWeddingId] = useState(weddings[0]?.id || "");
    const [preview, setPreview] = useState<CSVRow[]>([]);
    const [message, setMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                setPreview(results.data.slice(0, 5) as CSVRow[]); // Show first 5 rows
            },
        });
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        const fileInput = document.getElementById(
            "csv-file"
        ) as HTMLInputElement;
        const file = fileInput?.files?.[0];

        if (!file) return;

        setLoading(true);
        setMessage(null);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const response = await fetch("/api/guests/import", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            weddingId,
                            guests: results.data,
                        }),
                    });

                    const data = await response.json();

                    if (response.ok) {
                        setMessage({
                            type: "success",
                            text: `✅ Successfully imported ${
                                data.count
                            } guests!${
                                data.duplicates > 0
                                    ? ` (${data.duplicates} duplicates skipped)`
                                    : ""
                            }`,
                        });
                        setPreview([]);
                        fileInput.value = "";
                        router.refresh();
                    } else {
                        setMessage({
                            type: "error",
                            text: `❌ Error: ${
                                data.error || "Failed to import guests"
                            }`,
                        });
                    }
                } catch (error) {
                    console.error("Error importing guests:", error);
                    setMessage({
                        type: "error",
                        text: "❌ Network error. Please try again.",
                    });
                } finally {
                    setLoading(false);
                }
            },
        });
    };

    return (
        <div className="space-y-4">
            {weddings.length > 1 && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Wedding
                    </label>
                    <select
                        value={weddingId}
                        onChange={(e) => setWeddingId(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                    >
                        {weddings.map((wedding) => (
                            <option key={wedding.id} value={wedding.id}>
                                {wedding.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {message && (
                <div
                    className={`p-4 rounded-lg ${
                        message.type === "success"
                            ? "bg-green-50 text-green-800"
                            : "bg-red-50 text-red-800"
                    }`}
                >
                    <p className="text-sm font-medium">{message.text}</p>
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload CSV File
                </label>
                <input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100"
                />
                <p className="text-xs text-gray-500 mt-2">
                    CSV should have columns: name, email, phone, numberOfGuests,
                    maxGuests, isOnlyPemberkatan, notes
                </p>
            </div>

            {preview.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                        Preview ({preview.length} rows)
                    </p>
                    <div className="text-xs space-y-1">
                        {preview.map((row, i) => (
                            <div key={i} className="text-gray-600">
                                {row.name} - {row.phone || row.email}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <button
                onClick={handleUpload}
                disabled={loading || preview.length === 0}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-700 transition disabled:opacity-50"
            >
                {loading ? "Importing..." : "Import Guests"}
            </button>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-2">
                    CSV Template
                </p>
                <code className="text-xs text-blue-800 block overflow-x-auto whitespace-pre">
                    name,email,phone,numberOfGuests,maxGuests,isOnlyPemberkatan,notes
                    <br />
                    John Doe,john@example.com,+6281234567890,2,2,false,VIP Guest
                    <br />
                    Jane Smith,,+6281234567891,1,1,true,Pemberkatan only
                </code>
                <p className="text-xs text-gray-600 mt-2">
                    • maxGuests: Maximum number of guests allowed (default: 1)
                    <br />• isOnlyPemberkatan: true/false - Show only
                    pemberkatan option (default: false)
                </p>
            </div>
        </div>
    );
}
