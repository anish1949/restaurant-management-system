const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { authenticate, authorize, ROLES } = require("../middleware/auth");

// Helper function to safely truncate strings
const truncate = (str, maxLength = 50) => {
  if (!str) return "";
  return String(str).substring(0, maxLength);
};

// Get all tables with their current orders
router.get("/", authenticate, async (req, res) => {
  try {
    const { status, section } = req.query;

    let query = `
            SELECT t.*, 
                   u.full_name as waiter_name,
                   o.id as active_order_id,
                   o.total_amount as order_total,
                   o.created_at as order_time,
                   COUNT(oi.id) as item_count
            FROM tables t
            LEFT JOIN users u ON t.current_waiter_id = u.id
            LEFT JOIN orders o ON t.current_order_id = o.id AND o.status != 'paid'
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE t.is_active = true
        `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND t.status = $${paramIndex}`;
      params.push(truncate(status));
      paramIndex++;
    }

    if (section) {
      query += ` AND t.section = $${paramIndex}`;
      params.push(truncate(section));
      paramIndex++;
    }

    query +=
      " GROUP BY t.id, u.full_name, o.id, o.total_amount, o.created_at ORDER BY t.table_number";

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Get tables error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Internal server error",
      });
  }
});

// Get table by ID with full details
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const tableResult = await db.query(
      `
            SELECT t.*, 
                   u.full_name as waiter_name,
                   o.id as active_order_id,
                   o.total_amount as order_total,
                   o.created_at as order_time,
                   o.status as order_status,
                   o.guest_count
            FROM tables t
            LEFT JOIN users u ON t.current_waiter_id = u.id
            LEFT JOIN orders o ON t.current_order_id = o.id
            WHERE t.id = $1 AND t.is_active = true
        `,
      [id],
    );

    if (tableResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Table not found" });
    }

    const table = tableResult.rows[0];

    // Get active order items if there's an order
    let orderItems = [];
    if (table.active_order_id) {
      const itemsResult = await db.query(
        `
                SELECT oi.*, mi.name, mi.price
                FROM order_items oi
                JOIN menu_items mi ON oi.menu_item_id = mi.id
                WHERE oi.order_id = $1
            `,
        [table.active_order_id],
      );
      orderItems = itemsResult.rows;
    }

    // Get order history for this table
    const historyResult = await db.query(
      `
            SELECT o.id, o.order_number, o.total_amount, o.created_at, o.status
            FROM orders o
            WHERE o.table_id = $1
            ORDER BY o.created_at DESC
            LIMIT 10
        `,
      [id],
    );

    res.json({
      success: true,
      data: {
        ...table,
        current_order: table.active_order_id
          ? {
              id: table.active_order_id,
              total: table.order_total,
              time: table.order_time,
              status: table.order_status,
              guest_count: table.guest_count,
              items: orderItems,
            }
          : null,
        order_history: historyResult.rows,
      },
    });
  } catch (error) {
    console.error("Get table error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Internal server error",
      });
  }
});

// Create new table
router.post(
  "/",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  async (req, res) => {
    try {
      const {
        table_number,
        capacity,
        min_capacity,
        shape,
        section,
        location,
        position_x,
        position_y,
      } = req.body;

      // Check if table number already exists
      const existing = await db.query(
        "SELECT id FROM tables WHERE table_number = $1",
        [table_number],
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Table with this number already exists",
        });
      }

      // Truncate string values
      const shapeValue = truncate(shape || "round", 50);
      const sectionValue = truncate(section || "Main", 50);
      const locationValue = truncate(location, 255);

      const result = await db.query(
        `INSERT INTO tables (
                table_number, capacity, min_capacity, shape, section, 
                location, position_x, position_y, status, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
            RETURNING *`,
        [
          table_number,
          capacity,
          min_capacity || 1,
          shapeValue,
          sectionValue,
          locationValue,
          position_x || 0,
          position_y || 0,
          "available",
          true,
        ],
      );

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error("Create table error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  },
);

// Update table
router.put(
  "/:id",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Truncate string values in updates
      if (updates.shape) updates.shape = truncate(updates.shape, 50);
      if (updates.section) updates.section = truncate(updates.section, 50);
      if (updates.location) updates.location = truncate(updates.location, 255);
      if (updates.status) updates.status = truncate(updates.status, 50);

      const setClause = Object.keys(updates)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(", ");

      const values = [id, ...Object.values(updates)];

      const result = await db.query(
        `UPDATE tables SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
        values,
      );

      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Table not found" });
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error("Update table error:", error);
      res
        .status(500)
        .json({
          success: false,
          message: error.message || "Internal server error",
        });
    }
  },
);

// Delete table (soft delete)
router.delete(
  "/:id",
  authenticate,
  authorize(ROLES.ADMIN),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if table has active orders
      const activeOrder = await db.query(
        "SELECT id FROM orders WHERE table_id = $1 AND status NOT IN ($2, $3)",
        [id, "paid", "cancelled"],
      );

      if (activeOrder.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete table with active orders",
        });
      }

      // Soft delete
      const result = await db.query(
        "UPDATE tables SET is_active = false WHERE id = $1 RETURNING id",
        [id],
      );

      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Table not found" });
      }

      res.json({ success: true, message: "Table deleted successfully" });
    } catch (error) {
      console.error("Delete table error:", error);
      res
        .status(500)
        .json({
          success: false,
          message: error.message || "Internal server error",
        });
    }
  },
);

// Update table status
router.patch("/:id/status", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log(`Updating table ${id} status to:`, status);

    const validStatuses = [
      "available",
      "occupied",
      "reserved",
      "cleaning",
      "maintenance",
    ];
    const truncatedStatus = truncate(status, 50);

    if (!validStatuses.includes(truncatedStatus)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    let query = "UPDATE tables SET status = $1, updated_at = NOW()";
    const params = [truncatedStatus];

    if (truncatedStatus === "occupied") {
      query += ", occupied_since = NOW()";
    }

    if (truncatedStatus === "available") {
      query += ", current_order_id = NULL, occupied_since = NULL";
    }

    query += " WHERE id = $2 RETURNING *";
    params.push(id);

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Table not found" });
    }

    console.log("Table updated successfully:", result.rows[0]);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Update table status error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Internal server error",
      });
  }
});

// Assign waiter to table
router.patch(
  "/:id/assign-waiter",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { waiter_id } = req.body;

      const result = await db.query(
        "UPDATE tables SET current_waiter_id = $1 WHERE id = $2 RETURNING *",
        [waiter_id, id],
      );

      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Table not found" });
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error("Assign waiter error:", error);
      res
        .status(500)
        .json({
          success: false,
          message: error.message || "Internal server error",
        });
    }
  },
);

// Get table sections
router.get("/meta/sections", authenticate, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT DISTINCT section FROM tables WHERE is_active = true ORDER BY section",
    );
    res.json({ success: true, data: result.rows.map((r) => r.section) });
  } catch (error) {
    console.error("Get sections error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Internal server error",
      });
  }
});

module.exports = router;
