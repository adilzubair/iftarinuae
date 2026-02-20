import { useState, useCallback } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CloudinaryUploadProps {
    /** Up to 3 current image URLs */
    imageUrls: (string | null | undefined)[];
    /** Called when images change — always emits an array of exactly 3 elements */
    onChange: (urls: [string | null, string | null, string | null]) => void;
    className?: string;
    /** Limit visible upload slots (default: 3) */
    maxSlots?: number;
}

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;
const MAX_IMAGES = 3;

/** Upload a single file to Cloudinary and return the secure URL */
async function uploadToCloudinary(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
    );

    if (!res.ok) {
        throw new Error("Image upload failed. Please try again.");
    }

    const data = await res.json();
    return data.secure_url as string;
}

export function CloudinaryUpload({
    imageUrls,
    onChange,
    className,
    maxSlots = MAX_IMAGES,
}: CloudinaryUploadProps) {
    const [uploading, setUploading] = useState<number | null>(null); // slot index uploading

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

            // Basic client-side validation
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
                const url = await uploadToCloudinary(file);
                updated[slotIndex] = url;
                onChange(updated);
            } catch (err) {
                alert(err instanceof Error ? err.message : "Upload failed.");
            } finally {
                setUploading(null);
                // Reset the input so the same file can be re-selected if needed
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
                            /* ── Filled slot ── */
                            <div className="relative w-full h-full rounded-xl overflow-hidden border border-border group">
                                <img
                                    src={url}
                                    alt={`Image ${i + 1}`}
                                    className="w-full h-full object-cover"
                                />
                                {/* Remove button */}
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
                            /* ── Uploading ── */
                            <div className="w-full h-full rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            /* ── Empty slot ── */
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
