const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const ctrl = require("../Controller/userController");

router.post("/register", ctrl.register);
router.post("/verify-otp", ctrl.verifyOtp);
router.post("/login", ctrl.login);
router.post("/token", ctrl.refreshToken);
router.get("/search", auth, ctrl.searchUsers);
router.get("/profile", auth, ctrl.getProfile);
router.delete("/delete", auth, ctrl.deleteUser);

module.exports = router;
