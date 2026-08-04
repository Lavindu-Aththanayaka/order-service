const axios = require("axios");

const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || "http://localhost:8081";

// This module is the one place order-service talks to inventory-service.
// order-service never touches inventory-service's database directly —
// it only knows about this HTTP API, which is the core microservices
// principle this project demonstrates.

async function reserveStock(productId, quantity) {
  const res = await axios.post(`${INVENTORY_SERVICE_URL}/stock/reserve`, {
    productId,
    quantity,
  });
  return res.data;
}

async function releaseStock(productId, quantity) {
  const res = await axios.post(`${INVENTORY_SERVICE_URL}/stock/release`, {
    productId,
    quantity,
  });
  return res.data;
}

module.exports = { reserveStock, releaseStock };
