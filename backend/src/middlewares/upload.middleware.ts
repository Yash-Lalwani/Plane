import multer from "multer";
import { ApiError } from "../utils/api-error.js";

const MB = 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ATTACHMENT_TYPES = [...IMAGE_TYPES, "application/pdf", "text/plain"];

const allowTypes =
  (allowed: string[]): multer.Options["fileFilter"] =>
  (_req, file, callback) => {
    if (allowed.includes(file.mimetype)) {
      callback(null, true);
      return;
    }
    callback(new ApiError(400, `File type ${file.mimetype} is not allowed`));
  };

// Files stay in memory (req.file.buffer) and are streamed straight to Cloudinary.
export const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * MB, files: 1 },
  fileFilter: allowTypes(IMAGE_TYPES),
}).single("avatar");

export const uploadAttachments = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * MB, files: 5 },
  fileFilter: allowTypes(ATTACHMENT_TYPES),
}).array("files", 5);
