const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const ctrl = require("../Controller/userController");
const fs = require("fs");
const path = require("path");
const userCtrl = require("../Controller/userController");


router.get("/avatars", async (req, res) => {
  try {
    const dir = path.join(__dirname, "..", "assets", "avatars");
    const files = await fs.promises.readdir(dir);
    const images = files.filter(f => /\.(png|jpe?g|gif)$/i.test(f));
    const urls = images.map(f => `${req.protocol}://${req.get("host")}/assets/avatars/${f}`);
    res.json({ avatars: urls });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load avatars." });
  }
});

router.put("/profile-pic", auth, async (req, res) => {
  const { profilePicUrl } = req.body;
  if (!profilePicUrl) return res.status(400).json({ message: "No URL provided." });

  try {
    const user = await ctrl.User.findByIdAndUpdate(
      req.user.id,
      { avatar: profilePicUrl },
      { new: true }
    );
    res.json({ avatar: user.avatar });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not update profile picture." });
  }
});



router.post("/register", ctrl.register);
router.post("/verify-otp", ctrl.verifyOtp);
router.post("/login", ctrl.login);
router.post("/token", ctrl.refreshToken);
router.get("/search", auth, ctrl.searchUsers);
router.get("/profile", auth, ctrl.getProfile);
router.get("/:id", auth, ctrl.getUserById);
router.delete("/delete", auth, ctrl.deleteUser);
router.put("/about", auth, userCtrl.updateAbout);
module.exports = router;
