/**
 * Cloudflare R2 Storage Module
 *
 * Provides helpers to upload compressed images to R2 and generate public URLs.
 * Uses the S3-compatible API with @aws-sdk/client-s3.
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

const {
    S3_API_ENDPOINT,
    ACCESS_KEY_ID,
    SECRET_ACCESS_KEY,
    BUCKET_NAME,
    PUBLIC_URL,
} = process.env;

if (!S3_API_ENDPOINT || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET_NAME || !PUBLIC_URL) {
    console.warn("⚠️  R2 environment variables are not fully configured. Image uploads will fail.");
}

const r2 = new S3Client({
    region: "auto",
    endpoint: S3_API_ENDPOINT || "",
    credentials: {
        accessKeyId: ACCESS_KEY_ID || "",
        secretAccessKey: SECRET_ACCESS_KEY || "",
    },
});

/**
 * Compress an image buffer using Sharp.
 * Converts to WebP, resizes to max 1200px wide, 80% quality.
 * Typical output: 50-150 KB from a 2-5 MB input.
 */
export async function compressImage(inputBuffer: Buffer): Promise<Buffer> {
    return sharp(inputBuffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
}

/**
 * Upload a buffer to R2 and return the public URL.
 *
 * @param buffer - The file contents (ideally already compressed)
 * @param key    - The object key (path within the bucket), e.g. "places/abc123-1.webp"
 */
export async function uploadToR2(buffer: Buffer, key: string): Promise<string> {
    await r2.send(
        new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: "image/webp",
            CacheControl: "public, max-age=31536000", // 1 year — CDN + browser cache
        })
    );

    return `${PUBLIC_URL}/${key}`;
}

/**
 * Compress and upload an image in one step.
 * Returns the public URL.
 */
export async function compressAndUpload(
    inputBuffer: Buffer,
    key: string
): Promise<{ url: string; originalSize: number; compressedSize: number }> {
    const compressed = await compressImage(inputBuffer);
    const url = await uploadToR2(compressed, key);

    return {
        url,
        originalSize: inputBuffer.length,
        compressedSize: compressed.length,
    };
}

export { r2, BUCKET_NAME, PUBLIC_URL };
