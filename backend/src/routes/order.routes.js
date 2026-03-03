const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { authenticate, authorize, ROLES } = require("../middleware/auth");

// Helper function to safely truncate strings
const truncate = (str, maxLength = 50) => {
  if (!str) return "";
  return String(str).substring(0, maxLength);
};

// Get all orders
router.get("/", authenticate, async (req, res) => {
  try {
    const { status, date, table_id, limit, start_date, end_date } = req.query;

    let query = `
            SELECT o.*, 
                   t.table_number, 
                   u.full_name as waiter_name,
                   COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN tables t ON o.table_id = t.id
            LEFT JOIN users u ON o.waiter_id = u.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE 1=1
        `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND o.status = $${paramIndex}`;
      params.push(truncate(status));
      paramIndex++;
    }

    if (date) {
      query += ` AND DATE(o.created_at) = $${paramIndex}`;
      params.push(date);
      paramIndex++;
    }

    if (start_date) {
      query += ` AND DATE(o.created_at) >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND DATE(o.created_at) <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    if (table_id) {
      query += ` AND o.table_id = $${paramIndex}`;
      params.push(parseInt(table_id));
      paramIndex++;
    }

    query +=
      " GROUP BY o.id, t.table_number, u.full_name ORDER BY o.created_at DESC";

    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(parseInt(limit));
    }

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Get orders error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Internal server error",
      });
  }
});

// Get order by ID
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const orderResult = await db.query(
      `SELECT o.*, 
                    t.table_number, 
                    u.full_name as waiter_name,
                    c.full_name as customer_name, 
                    c.phone as customer_phone
             FROM orders o
             LEFT JOIN tables t ON o.table_id = t.id
             LEFT JOIN users u ON o.waiter_id = u.id
             LEFT JOIN customers c ON o.customer_id = c.id
             WHERE o.id = $1`,
      [id],
    );

    if (orderResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const itemsResult = await db.query(
      `SELECT oi.*, mi.name as item_name, mi.description
             FROM order_items oi
             JOIN menu_items mi ON oi.menu_item_id = mi.id
             WHERE oi.order_id = $1`,
      [id],
    );

    res.json({
      success: true,
      data: {
        ...orderResult.rows[0],
        items: itemsResult.rows,
      },
    });
  } catch (error) {
    console.error("Get order error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Internal server error",
      });
  }
});

// Create new order
router.post("/", authenticate, async (req, res) => {
  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    const {
      table_id,
      customer_id,
      order_type,
      items,
      special_instructions,
      guest_count,
      server_id,
    } = req.body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("No items in order");
    }

    // Generate order number
    const orderNumber =
      "ORD-" + Date.now() + "-" + Math.floor(Math.random() * 1000);

    // Calculate totals
    let subtotal = 0;
    const itemDetails = [];

    for (const item of items) {
      if (!item.menu_item_id || !item.quantity) {
        throw new Error("Invalid item data: missing menu_item_id or quantity");
      }

      const menuItem = await client.query(
        "SELECT id, price, name FROM menu_items WHERE id = $1 AND is_available = true",
        [item.menu_item_id],
      );

      if (menuItem.rows.length === 0) {
        throw new Error(
          `Menu item ID ${item.menu_item_id} not found or not available`,
        );
      }

      const price = parseFloat(menuItem.rows[0].price);
      const itemSubtotal = price * item.quantity;
      subtotal += itemSubtotal;

      itemDetails.push({
        ...item,
        price,
        name: menuItem.rows[0].name,
      });
    }

    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    // Truncate all string values to safe lengths
    const orderTypeValue = truncate(order_type || "dine-in", 50);
    const instructionsValue = truncate(special_instructions, 500);
    const guestCountValue = guest_count ? parseInt(guest_count) : 1;
    const waiterId = server_id || req.user.id;

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (
                order_number, table_id, customer_id, waiter_id, 
                order_type, subtotal, tax, total_amount, 
                special_instructions, guest_count, status, payment_status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()) 
            RETURNING *`,
      [
        orderNumber,
        table_id || null,
        customer_id || null,
        waiterId,
        orderTypeValue,
        subtotal,
        tax,
        total,
        instructionsValue,
        guestCountValue,
        "pending",
        "unpaid",
      ],
    );

    const order = orderResult.rows[0];

    // Create order items with truncated notes
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const details = itemDetails[i];

      const notesValue = truncate(item.notes, 500);

      await client.query(
        `INSERT INTO order_items (
                    order_id, menu_item_id, quantity, unit_price, subtotal, notes
                ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          order.id,
          item.menu_item_id,
          item.quantity,
          details.price,
          details.price * item.quantity,
          notesValue,
        ],
      );
    }

    // Update table status if dine-in
    if (orderTypeValue === "dine-in" && table_id) {
      await client.query(
        `UPDATE tables 
                 SET status = 'occupied', 
                     current_order_id = $1,
                     occupied_since = NOW(),
                     updated_at = NOW() 
                 WHERE id = $2`,
        [order.id, table_id],
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      data: order,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create order error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error creating order",
    });
  } finally {
    client.release();
  }
});

// Update order status
router.patch("/:id/status", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate and truncate status
    const validStatuses = [
      "pending",
      "preparing",
      "ready",
      "served",
      "paid",
      "cancelled",
    ];
    const truncatedStatus = truncate(status, 50);

    if (!validStatuses.includes(truncatedStatus)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    const result = await db.query(
      "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [truncatedStatus, id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // If order is paid or cancelled, free up the table
    if (truncatedStatus === "paid" || truncatedStatus === "cancelled") {
      await db.query(
        `UPDATE tables 
                 SET status = 'available', 
                     current_order_id = NULL,
                     occupied_since = NULL,
                     updated_at = NOW() 
                 WHERE current_order_id = $1`,
        [id],
      );
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Update order status error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Internal server error",
      });
  }
});

module.exports = router;
