const express = require("express");
const { sendEmail, register, login } = require("../controllers/userController");
const router = require("express").Router(); 


router.post("/send-code", sendEmail );

// Register User
router.post("/register", register);
router.post("/login", login);

module.exports = router;