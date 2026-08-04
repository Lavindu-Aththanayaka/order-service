const express = require("express");
const pool = require("../db/pool");
const { reserveStock, releaseStock } = require("../services/inventoryClient");

const router = express.Router();

// GET /orders/:userId
router.get("/:userId", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC",
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// POST /orders  { userId, items: [{ productId, quantity, unitPrice }] }
// This is the checkout flow. Order-service reserves stock in
// inventory-service BEFORE saving the order. If any item fails to
// reserve, everything already reserved is rolled back and the whole
// checkout is rejected.
router.post("/", async (req, res) => {
  const { userId, items } = req.body;
  if (!userId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "userId and a non-empty items array are required" });
  }

  const reserved = [];

  try {
    // Reserve stock for each item, one at a time.
    for (const item of items) {
      await reserveStock(item.productId, item.quantity);
      reserved.push(item);
    }
  } catch (err) {
    // Roll back anything we already reserved before this failure.
    for (const item of reserved) {
      try {
        await releaseStock(item.productId, item.quantity);
      } catch (releaseErr) {
        console.error("Failed to release stock during rollback", releaseErr.message);
      }
    }

    if (err.response && err.response.status === 409) {
      return res.status(409).json({
        error: "One or more items are out of stock",
        details: err.response.data,
      });
    }
    console.error(err);
    return res.status(502).json({ error: "Inventory service unavailable, order not placed" });
  }

  // All items reserved successfully — save the order.
  const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  try {
    const result = await pool.query(
      `INSERT INTO orders (user_id, items, total, status)
       VALUES ($1, $2, $3, 'confirmed') RETURNING *`,
      [userId, JSON.stringify(items), total]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    // Order failed to save even though stock was reserved — release it back.
    for (const item of items) {
      try {
        await releaseStock(item.productId, item.quantity);
      } catch (releaseErr) {
        console.error("Failed to release stock after order save failure", releaseErr.message);
      }
    }
    console.error(err);
    res.status(500).json({ error: "Failed to save order" });
  }
});

module.exports = router;
