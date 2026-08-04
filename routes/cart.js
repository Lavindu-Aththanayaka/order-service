const express = require("express");
const pool = require("../db/pool");

const router = express.Router();

// GET /cart/:userId
router.get("/:userId", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM cart_items WHERE user_id = $1 ORDER BY id ASC",
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch cart" });
  }
});

// POST /cart  { userId, productId, quantity, unitPrice }
router.post("/", async (req, res) => {
  const { userId, productId, quantity, unitPrice } = req.body;
  if (!userId || !productId || !quantity || unitPrice === undefined) {
    return res.status(400).json({ error: "userId, productId, quantity, unitPrice are required" });
  }
  try {
    const result = await pool.query(
      `INSERT INTO cart_items (user_id, product_id, quantity, unit_price)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, productId, quantity, unitPrice]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add item to cart" });
  }
});

// DELETE /cart/:itemId
router.delete("/:itemId", async (req, res) => {
  try {
    await pool.query("DELETE FROM cart_items WHERE id = $1", [req.params.itemId]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove cart item" });
  }
});

module.exports = router;
