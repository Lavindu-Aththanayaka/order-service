const express = require("express");
const pool = require("../db/pool");
const { reserveStock, releaseStock } = require("../services/inventoryClient");

const router = express.Router();

// GET /orders/:userId
router.get("/:userId", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC",
      [req.params.userId],
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

router.post("/", async (req, res) => {
  const { userId, items } = req.body;
  if (!userId || !Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ error: "userId and a non-empty items array are required" });
  }

  const reserved = [];

  try {
    for (const item of items) {
      // calls inventory-service
      await reserveStock(item.productId, item.quantity);
      reserved.push(item);
    }
  } catch (err) {
    for (const item of reserved) {
      try {
        await releaseStock(item.productId, item.quantity);
      } catch (releaseErr) {
        console.error(
          "Failed to release stock during rollback",
          releaseErr.message,
        );
      }
    }

    if (err.response && err.response.status === 409) {
      return res.status(409).json({
        error: "One or more items are out of stock",
        details: err.response.data,
      });
    }
    console.error(err);
    return res
      .status(502)
      .json({ error: "Inventory service unavailable, order not placed" });
  }

  const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  try {
    const result = await pool.query(
      `INSERT INTO orders (user_id, items, total, status)
       VALUES ($1, $2, $3, 'confirmed') RETURNING *`,
      [userId, JSON.stringify(items), total],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    for (const item of items) {
      try {
        await releaseStock(item.productId, item.quantity);
      } catch (releaseErr) {
        console.error(
          "Failed to release stock after order save failure",
          releaseErr.message,
        );
      }
    }
    console.error(err);
    res.status(500).json({ error: "Failed to save order" });
  }
});

module.exports = router;
