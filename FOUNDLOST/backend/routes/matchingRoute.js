const express = require("express");
const { getMatches, getAllMatches } = require("../controller/matchingController");

const router = express.Router();
router.get("/all", getAllMatches);
// GET /matching/lost/:itemId ค้นหาของที่พบ และ GET /matching/found/:itemId ค้นหาของหาย
router.get("/:type/:itemId", getMatches);

module.exports = router;
