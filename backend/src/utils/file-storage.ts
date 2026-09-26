import { cloudinary } from "../config/cloudinary.js";
import { logger } from "../config/logger.js";

export type StoredFile = {
  url: string;
  publicId: string;
};

export const uploadFile = (
  buffer: Buffer,
  folder: string,
): Promise<StoredFile> =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto" },
      (error, result) => {
        if (error || !result) {
          reject(
            new Error(
              `Cloudinary upload failed: ${error?.message ?? "no result"}`,
            ),
          );
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });

// Cloudinary stores images and PDFs as "image" and other files (like plain text) as "raw",
// and destroy() only finds a file when given the matching type.
// Failures are logged, not thrown: a leftover file must not fail the user's request.
export const deleteFile = async (
  publicId: string,
  resourceType: "image" | "raw" = "image",
): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  } catch (error) {
    logger.warn(
      { err: error, publicId },
      "Failed to delete file from Cloudinary",
    );
  }
};
