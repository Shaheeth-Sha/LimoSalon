const express = require("express");
const router = express.Router();

const { getHairLengths } = require("../controllers/hairLengthController");

router.get("/", getHairLengths);

module.exports = router;