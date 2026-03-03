const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { authenticate, authorize, ROLES } = require("../middleware/auth");

// Helper function to safely truncate strings
const truncate = (str, maxLength = 255) => {
  if (!str) return "";
  return String(str).substring(0, maxLength);
};

// ==================== GET INVENTORY CATEGORIES ====================
router.get("/categories", authenticate, async (req, res) => {
  try {
    console.log("Fetching inventory categories...");
    const result = await db.query(
      "SELECT * FROM inventory_categories ORDER BY name",
    );
    console.log("Categories found:", result.rows.length);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Get inventory categories error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error loading categories",
    });
  }
});

// ==================== GET INVENTORY ITEMS ====================
router.get("/", authenticate, async (req, res) => {
  try {
    const { low_stock, category } = req.query;

    let query = `
            SELECT i.*, 
                   ic.name as category_name,
                   s.name as supplier_name,
                   CASE 
                       WHEN i.quantity <= i.reorder_level THEN 'Low Stock'
                       WHEN i.quantity <= i.reorder_level * 2 THEN 'Medium Stock'
                       ELSE 'Good Stock'
                   END as stock_status
            FROM inventory i
            LEFT JOIN inventory_categories ic ON i.category_id = ic.id
            LEFT JOIN suppliers s ON i.supplier_id = s.id
            WHERE 1=1
        `;
    const params = [];
    let paramIndex = 1;

    if (low_stock === "true") {
      query += ` AND i.quantity <= i.reorder_level`;
    }

    if (category && category !== "undefined" && category !== "null") {
      query += ` AND ic.id = $${paramIndex}`;
      params.push(parseInt(category));
      paramIndex++;
    }

    query += " ORDER BY i.item_name";

    console.log("Fetching inventory with query:", query);
    console.log("With params:", params);

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Get inventory error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Internal server error",
      });
  }
});

// ==================== GET SINGLE INVENTORY ITEM ====================
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT i.*, 
                    ic.name as category_name, 
                    s.name as supplier_name, 
                    s.phone as supplier_phone 
             FROM inventory i
             LEFT JOIN inventory_categories ic ON i.category_id = ic.id
             LEFT JOIN suppliers s ON i.supplier_id = s.id
             WHERE i.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Inventory item not found" });
    }

    // Get transaction history
    const transactions = await db.query(
      `SELECT * FROM inventory_transactions 
             WHERE inventory_id = $1 
             ORDER BY created_at DESC 
             LIMIT 20`,
      [id],
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        transaction_history: transactions.rows,
      },
    });
  } catch (error) {
    console.error("Get inventory item error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Internal server error",
      });
  }
});

// ==================== CREATE INVENTORY ITEM ====================
router.post(
  "/",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  async (req, res) => {
    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      const {
        item_name,
        category_id,
        quantity,
        unit,
        reorder_level,
        unit_cost,
        supplier_id,
        min_quantity,
        max_quantity,
        location,
        expiry_date,
        batch_number,
        notes,
      } = req.body;

      console.log("Creating inventory item with data:", req.body);

      // Validate required fields
      if (!item_name || item_name.trim() === "") {
        return res
          .status(400)
          .json({ success: false, message: "Item name is required" });
      }

      if (quantity === undefined || quantity === null || quantity === "") {
        return res
          .status(400)
          .json({ success: false, message: "Quantity is required" });
      }

      const quantityNum = parseFloat(quantity);
      if (isNaN(quantityNum) || quantityNum < 0) {
        return res
          .status(400)
          .json({ success: false, message: "Valid quantity is required" });
      }

      // Truncate string values
      const truncatedName = truncate(item_name.trim(), 255);
      const truncatedLocation = truncate(location || "", 255);
      const truncatedBatch = truncate(batch_number || "", 100);
      const truncatedNotes = truncate(notes || "", 500);

      const result = await client.query(
        `INSERT INTO inventory (
                item_name, 
                category_id, 
                quantity, 
                unit, 
                reorder_level, 
                unit_cost,
                supplier_id, 
                min_quantity, 
                max_quantity, 
                location, 
                expiry_date,
                batch_number, 
                notes,
                created_at, 
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()) 
            RETURNING *`,
        [
          truncatedName,
          category_id ? parseInt(category_id) : null,
          quantityNum,
          unit || "kg",
          reorder_level ? parseFloat(reorder_level) : 0,
          unit_cost ? parseFloat(unit_cost) : 0,
          supplier_id ? parseInt(supplier_id) : null,
          min_quantity ? parseFloat(min_quantity) : 0,
          max_quantity ? parseFloat(max_quantity) : 0,
          truncatedLocation,
          expiry_date || null,
          truncatedBatch,
          truncatedNotes,
        ],
      );

      // Create initial transaction
      try {
        await client.query(
          `INSERT INTO inventory_transactions (
                    inventory_id, transaction_type, quantity, unit_price, 
                    total_amount, notes, created_by, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            result.rows[0].id,
            "purchase",
            quantityNum,
            unit_cost ? parseFloat(unit_cost) : 0,
            quantityNum * (unit_cost ? parseFloat(unit_cost) : 0),
            "Initial stock",
            req.user.id,
          ],
        );
      } catch (transError) {
        console.log("Transaction logging failed:", transError.message);
        // Continue even if transaction logging fails
      }

      await client.query("COMMIT");

      console.log("Inventory item created:", result.rows[0]);
      res.status(201).json({
        success: true,
        message: "Inventory item created successfully",
        data: result.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Create inventory error:", error);
      res.status(500).json({
        success: false,
        message:
          error.message || "Internal server error creating inventory item",
      });
    } finally {
      client.release();
    }
  },
);

// ==================== UPDATE INVENTORY ITEM ====================
router.put(
  "/:id",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      console.log("Updating inventory item:", id, updates);

      // Check if item exists
      const checkItem = await db.query(
        "SELECT * FROM inventory WHERE id = $1",
        [id],
      );
      if (checkItem.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Inventory item not found" });
      }

      // Build update query dynamically
      const updateFields = [];
      const values = [id];
      let paramIndex = 2;

      if (updates.item_name !== undefined) {
        updateFields.push(`item_name = $${paramIndex++}`);
        values.push(truncate(updates.item_name, 255));
      }
      if (updates.category_id !== undefined) {
        updateFields.push(`category_id = $${paramIndex++}`);
        values.push(updates.category_id ? parseInt(updates.category_id) : null);
      }
      if (updates.quantity !== undefined) {
        const quantityNum = parseFloat(updates.quantity);
        if (isNaN(quantityNum)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid quantity value" });
        }
        updateFields.push(`quantity = $${paramIndex++}`);
        values.push(quantityNum);
      }
      if (updates.unit !== undefined) {
        updateFields.push(`unit = $${paramIndex++}`);
        values.push(updates.unit);
      }
      if (updates.reorder_level !== undefined) {
        updateFields.push(`reorder_level = $${paramIndex++}`);
        values.push(
          updates.reorder_level ? parseFloat(updates.reorder_level) : 0,
        );
      }
      if (updates.unit_cost !== undefined) {
        updateFields.push(`unit_cost = $${paramIndex++}`);
        values.push(updates.unit_cost ? parseFloat(updates.unit_cost) : 0);
      }
      if (updates.supplier_id !== undefined) {
        updateFields.push(`supplier_id = $${paramIndex++}`);
        values.push(updates.supplier_id ? parseInt(updates.supplier_id) : null);
      }
      if (updates.min_quantity !== undefined) {
        updateFields.push(`min_quantity = $${paramIndex++}`);
        values.push(
          updates.min_quantity ? parseFloat(updates.min_quantity) : 0,
        );
      }
      if (updates.max_quantity !== undefined) {
        updateFields.push(`max_quantity = $${paramIndex++}`);
        values.push(
          updates.max_quantity ? parseFloat(updates.max_quantity) : 0,
        );
      }
      if (updates.location !== undefined) {
        updateFields.push(`location = $${paramIndex++}`);
        values.push(truncate(updates.location || "", 255));
      }
      if (updates.expiry_date !== undefined) {
        updateFields.push(`expiry_date = $${paramIndex++}`);
        values.push(updates.expiry_date || null);
      }
      if (updates.batch_number !== undefined) {
        updateFields.push(`batch_number = $${paramIndex++}`);
        values.push(truncate(updates.batch_number || "", 100));
      }
      if (updates.notes !== undefined) {
        updateFields.push(`notes = $${paramIndex++}`);
        values.push(truncate(updates.notes || "", 500));
      }

      // Always update the updated_at timestamp
      updateFields.push(`updated_at = NOW()`);

      if (updateFields.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "No fields to update" });
      }

      const query = `UPDATE inventory SET ${updateFields.join(", ")} WHERE id = $1 RETURNING *`;
      console.log("Update query:", query);
      console.log("Update values:", values);

      const result = await db.query(query, values);

      console.log("Inventory item updated:", result.rows[0]);

      res.json({
        success: true,
        message: "Inventory item updated successfully",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Update inventory error:", error);
      res.status(500).json({
        success: false,
        message:
          error.message || "Internal server error updating inventory item",
      });
    }
  },
);

// ==================== UPDATE QUANTITY ====================
router.patch(
  "/:id/quantity",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  async (req, res) => {
    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      const { id } = req.params;
      const { quantity, operation } = req.body;

      console.log(
        `Adjusting quantity for item ${id}: ${operation} ${quantity}`,
      );

      // Validate inputs
      if (quantity === undefined || quantity === null || quantity === "") {
        return res
          .status(400)
          .json({ success: false, message: "Quantity is required" });
      }

      const quantityNum = parseFloat(quantity);
      if (isNaN(quantityNum) || quantityNum <= 0) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Valid positive quantity is required",
          });
      }

      if (!operation || !["add", "subtract"].includes(operation)) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Valid operation (add/subtract) is required",
          });
      }

      // Get current item
      const itemResult = await client.query(
        "SELECT * FROM inventory WHERE id = $1",
        [id],
      );

      if (itemResult.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Inventory item not found" });
      }

      const item = itemResult.rows[0];
      const currentQuantity = parseFloat(item.quantity) || 0;
      let newQuantity;

      if (operation === "add") {
        newQuantity = currentQuantity + quantityNum;
      } else {
        if (currentQuantity < quantityNum) {
          return res.status(400).json({
            success: false,
            message: `Insufficient quantity. Available: ${currentQuantity} ${item.unit}`,
          });
        }
        newQuantity = currentQuantity - quantityNum;
      }

      // Update quantity
      const updateResult = await client.query(
        "UPDATE inventory SET quantity = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
        [newQuantity, id],
      );

      // Create transaction record
      try {
        await client.query(
          `INSERT INTO inventory_transactions (
                    inventory_id, transaction_type, quantity, unit_price, 
                    total_amount, notes, created_by, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            id,
            operation === "add" ? "purchase" : "sale",
            quantityNum,
            item.unit_cost || 0,
            quantityNum * (item.unit_cost || 0),
            `Quantity ${operation === "add" ? "added" : "subtracted"} via adjustment`,
            req.user.id,
          ],
        );
      } catch (transError) {
        console.log("Transaction logging failed:", transError.message);
        // Continue even if transaction logging fails
      }

      await client.query("COMMIT");

      console.log("Quantity updated successfully:", updateResult.rows[0]);
      res.json({
        success: true,
        message: `Quantity ${operation === "add" ? "added" : "subtracted"} successfully`,
        data: updateResult.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Update quantity error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error updating quantity",
      });
    } finally {
      client.release();
    }
  },
);

// ==================== DELETE INVENTORY ITEM ====================
router.delete(
  "/:id",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  async (req, res) => {
    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      const { id } = req.params;

      // Check if item exists
      const checkItem = await client.query(
        "SELECT id, item_name FROM inventory WHERE id = $1",
        [id],
      );
      if (checkItem.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Inventory item not found" });
      }

      // Delete related transactions first
      await client.query(
        "DELETE FROM inventory_transactions WHERE inventory_id = $1",
        [id],
      );

      // Delete the item
      const result = await client.query(
        "DELETE FROM inventory WHERE id = $1 RETURNING id, item_name",
        [id],
      );

      await client.query("COMMIT");

      console.log("Inventory item deleted:", result.rows[0]);
      res.json({
        success: true,
        message: `Item "${result.rows[0].item_name}" deleted successfully`,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Delete inventory error:", error);
      res.status(500).json({
        success: false,
        message:
          error.message || "Internal server error deleting inventory item",
      });
    } finally {
      client.release();
    }
  },
);

// ==================== GET INVENTORY CATEGORIES LIST ====================
router.get("/categories/list", authenticate, async (req, res) => {
  try {
    console.log("Fetching inventory categories list...");
    const result = await db.query(
      "SELECT * FROM inventory_categories ORDER BY name",
    );
    console.log("Categories found:", result.rows.length);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Get inventory categories list error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error loading categories",
    });
  }
});

module.exports = router;
