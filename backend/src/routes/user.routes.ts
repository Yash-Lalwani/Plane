import { Router } from "express";
import { updateAvatar, updateProfile } from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { uploadAvatar } from "../middlewares/upload.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { updateProfileSchema } from "../validators/user.validator.js";

export const userRouter = Router();

userRouter.use(verifyJWT);

userRouter.patch("/me", validate({ body: updateProfileSchema }), updateProfile);
userRouter.patch("/me/avatar", uploadAvatar, updateAvatar);
