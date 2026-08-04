require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cartRouter = require("./routes/cart");
const ordersRouter = require("./routes/orders");

const app = express();
const PORT = process.env.PORT || 8082;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "order-service" });
});

app.use("/cart", cartRouter);
app.use("/orders", ordersRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`order-service listening on port ${PORT}`);
  });
}

module.exports = app;
