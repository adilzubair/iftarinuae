import { useState, useCallback } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getIdToken } from "@/lib/firebase";

interface ImageUploadProps {
    /** Up to 3 current image URLs */
    imageUrls: (string | null | undefined)[];
    /** Called when images change — always emits an array of exactly 3 elements */
    onChange: (urls: [string | null, string | null, string | null]) => void;
    className?: string;
    /** Limit visible upload slots (default: 3) */
    maxSlots?: number;
}

const MAX_IMAGES = 3;

/** Upload a single file to the server (which compresses + stores in R2) */
async function uploadImage(file: File): Promise<string> {
    const token = await getIdToken();
    if (!token) throw new Error("You must be logged in to upload images.");

    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch("/api/upload-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(body.message || "Image upload failed. Please try again.");
    }

    const data = await res.json();
    return data.url as string;
}

export function ImageUpload({
    imageUrls,
    onChange,
    className,
    maxSlots = MAX_IMAGES,
}: ImageUploadProps) {
    const [uploading, setUploading] = useState<number | null>(null);

    // Normalise to exactly 3 slots
    const slots: (string | null)[] = [
        imageUrls[0] ?? null,
        imageUrls[1] ?? null,
        imageUrls[2] ?? null,
    ];

    const handleFileChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => {
            const file = e.target.files?.[0];
            if (!file) return;

            if (!file.type.startsWith("image/")) {
                alert("Please select an image file.");
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                alert("Image must be under 10 MB.");
                return;
            }

            const updated = [...slots] as [string | null, string | null, string | null];

            try {
                setUploading(slotIndex);
                const url = await uploadImage(file);
                updated[slotIndex] = url;
                onChange(updated);
            } catch (err) {
                alert(err instanceof Error ? err.message : "Upload failed.");
            } finally {
                setUploading(null);
                e.target.value = "";
            }
        },
        [slots, onChange]
    );

    const handleRemove = useCallback(
        (slotIndex: number) => {
            const updated = [...slots] as [string | null, string | null, string | null];
            updated[slotIndex] = null;
            onChange(updated);
        },
        [slots, onChange]
    );

    return (
        <div className={cn("space-y-3", className)}>
            <p className="text-sm text-muted-foreground">
                Up to {maxSlots} photo{maxSlots > 1 ? "s" : ""}. Each photo must be under 10 MB.
            </p>

            <div className={cn("grid gap-3", maxSlots === 1 ? "grid-cols-1" : maxSlots === 2 ? "grid-cols-2" : "grid-cols-3")}>
                {slots.slice(0, maxSlots).map((url, i) => (
                    <div key={i} className="relative aspect-square">
                        {url ? (
                            <div className="relative w-full h-full rounded-xl overflow-hidden border border-border group">
                                <img
                                    src={url}
                                    alt={`Image ${i + 1}`}
                                    className="w-full h-full object-cover"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleRemove(i)}
                                    className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label="Remove image"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ) : uploading === i ? (
                            <div className="w-full h-full rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <label
                                htmlFor={`image-upload-${i}`}
                                className="w-full h-full rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors"
                            >
                                <ImagePlus className="w-6 h-6 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                    Photo {i + 1}
                                </span>
                                <input
                                    id={`image-upload-${i}`}
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    onChange={(e) => handleFileChange(e, i)}
                                    disabled={uploading !== null}
                                />
                            </label>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
