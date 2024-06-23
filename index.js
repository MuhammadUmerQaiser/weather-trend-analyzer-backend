const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const route = require("./src/route");

const app = express();
const port = 5000;

const allowedOrigins = ["http://localhost:3000"];

app.use(bodyParser.json());
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("NOT ALLOWED BY CORS"));
      }
    },
    methods: "GET,POST,PUT,PATCH,DELETE,HEAD",
    credentials: true,
    optionsSuccessStatus: 204,
  })
);

app.use("/api", route);

app.listen(port, () => {
  console.log(`SERVER IS RUNNING ON PORT ${port}`);
});
