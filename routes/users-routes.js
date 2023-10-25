const express = require("express");
const { signup } = require("../controllers/users-controller");

const router = express.Router();

router.get("/", (req, res, next) => {
  console.log("Get req users");
  res.json({ message: "it works" });
});

router.post("/signup", signup);

module.exports = router;
