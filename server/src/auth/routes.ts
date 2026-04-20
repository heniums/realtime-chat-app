import { Router } from "express";
import { register } from "./register";
import { login } from "./login";
import { logout, me } from "./session";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", me);

export default router;
