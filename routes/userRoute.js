const express = require("express");
const { sendEmail, register, login, sendResetCode, resetPassword, changeLoginPassword } = require("../controllers/userController");
const router = require("express").Router(); 


router.post("/send-code", sendEmail );

// Register User
router.post("/register", register);
router.post("/login", login);

router.post("/send-reset-code", sendResetCode);
router.post("/reset-password", resetPassword);
router.post("/change-login-password", changeLoginPassword);

module.exports = router;