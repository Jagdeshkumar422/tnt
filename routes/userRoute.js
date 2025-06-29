const express = require("express");
const { sendEmail, register, login, sendResetCode, resetPassword, changeLoginPassword, sendWithdrawalCode, changeWithdrawalPassword, getUsers, updateUser, toggleBlockUser, updateProfilePic, updateUserLevel } = require("../controllers/userController");
const auth = require("../middleware/auth");
const router = require("express").Router(); 
const upload = require("../middleware/upload")


router.post("/send-code", sendEmail );

// Register User
router.post("/register", register);
router.post("/block", toggleBlockUser);
router.post("/login", login);
router.get("/user/:id", getUsers)

router.post("/send-reset-code", sendResetCode);
router.post("/reset-password", resetPassword);
router.post("/change-login-password", changeLoginPassword);
router.post("/send-withdrawal-code", sendWithdrawalCode);
router.post("/change-withdrawal-password", changeWithdrawalPassword);

// PUT /api/user/update
router.put('/user/update', auth, updateUser);
router.post('/update-profile-pic', auth, upload.single('image'), updateProfilePic);
router.post("/update-user-level", updateUserLevel);

module.exports = router;