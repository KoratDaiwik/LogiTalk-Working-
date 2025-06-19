const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const profileController = require("../Controller/profileController");

// GET numeric IDs
router.get("/avatars", profileController.getAvatars);

// PUT numeric selection
router.put("/avatar", auth, profileController.setAvatar);

module.exports = router;
