const axios = require("axios");

const INVENTORY_SERVICE_URL =
  process.env.INVENTORY_SERVICE_URL || "http://localhost:8081";

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
