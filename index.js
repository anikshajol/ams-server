const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const jwt = require("jsonwebtoken");

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
  res.send("hello server");
});

app.listen(port, () => {
  console.log(`server is running on ${5000} port`);
});
