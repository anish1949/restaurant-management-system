const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { authenticate, authorize, ROLES } = require("../middleware/auth");

// Helper function to safely truncate strings
const truncate = (str, maxLength = 255) => {
  if (!str) return "";
  return String(str).substring(0, maxLength);
};

// ==================== GET ALL MENU ITEMS ====================
router.get("/items", authenticate, async (req, res) => {
  try {
    const { category, available } = req.query;

    let query = "SELECT * FROM menu_items WHERE 1=1";
    const params = [];
    let paramIndex = 1;

    if (category && category !== "undefined" && category !== "null") {
      query += ` AND category_name = $${paramIndex}`;
      params.push(truncate(category, 100));
      paramIndex++;
    }

    if (available === "true") {
      query += ` AND is_available = true`;
    }

    query += " ORDER BY category_name, name";

    console.log("Executing query:", query);
    console.log("With params:", params);

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Get menu items error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Internal server error",
      });
  }
});

// ==================== GET SINGLE MENU ITEM ====================
router.get("/items/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Fetching menu item with ID:", id);

    const result = await db.query("SELECT * FROM menu_items WHERE id = $1", [
      id,
    ]);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Menu item not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Get menu item error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Internal server error",
      });
  }
});

// ==================== CREATE MENU ITEM ====================
router.post(
  "/items",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  async (req, res) => {
    try {
      console.log("Creating menu item with data:", req.body);

      const {
        name,
        category_name,
        description,
        price,
        cost,
        image_url,
        is_vegetarian,
        is_vegan,
        is_gluten_free,
        is_spicy,
        is_signature,
        is_special,
        preparation_time,
        tax_rate,
        discount_allowed,
        track_inventory,
        stock_quantity,
        reorder_level,
      } = req.body;

      // Validate required fields
      if (!name || name.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Item name is required",
        });
      }

      if (!price || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
        return res.status(400).json({
          success: false,
          message: "Valid price is required",
        });
      }

      // Truncate string values to safe lengths
      const truncatedName = truncate(name.trim(), 255);
      const truncatedCategory = truncate(category_name || "", 100);
      const truncatedDescription = truncate(description || "", 500);
      const truncatedImageUrl = truncate(image_url || "", 500);

      const result = await db.query(
        `INSERT INTO menu_items (
                name, 
                category_name, 
                description, 
                price, 
                cost,
                image_url, 
                is_vegetarian, 
                is_vegan, 
                is_gluten_free,
                is_spicy, 
                is_signature, 
                is_special, 
                preparation_time,
                tax_rate, 
                discount_allowed, 
                track_inventory,
                stock_quantity, 
                reorder_level, 
                is_available,
                created_at,
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, true, NOW(), NOW()) 
            RETURNING *`,
        [
          truncatedName,
          truncatedCategory,
          truncatedDescription,
          parseFloat(price),
          cost ? parseFloat(cost) : 0,
          truncatedImageUrl,
          is_vegetarian || false,
          is_vegan || false,
          is_gluten_free || false,
          is_spicy || false,
          is_signature || false,
          is_special || false,
          preparation_time ? parseInt(preparation_time) : 0,
          tax_rate ? parseFloat(tax_rate) : 10.0,
          discount_allowed !== false,
          track_inventory || false,
          stock_quantity ? parseInt(stock_quantity) : 0,
          reorder_level ? parseInt(reorder_level) : 0,
        ],
      );

      console.log("Item created successfully:", result.rows[0]);

      res.status(201).json({
        success: true,
        message: "Menu item created successfully",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Create menu item error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error creating menu item",
      });
    }
  },
);

// ==================== UPDATE MENU ITEM ====================
router.put(
  "/items/:id",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  async (req, res) => {
    try {
      const { id } = req.params;
      console.log("Updating menu item ID:", id);
      console.log("Update data:", req.body);

      // Check if item exists
      const checkItem = await db.query(
        "SELECT * FROM menu_items WHERE id = $1",
        [id],
      );
      if (checkItem.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Menu item not found" });
      }

      const updates = req.body;
      const updateFields = [];
      const values = [id];
      let paramIndex = 2;

      // Build dynamic update query based on provided fields
      if (updates.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        values.push(truncate(updates.name, 255));
      }
      if (updates.category_name !== undefined) {
        updateFields.push(`category_name = $${paramIndex++}`);
        values.push(truncate(updates.category_name || "", 100));
      }
      if (updates.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        values.push(truncate(updates.description || "", 500));
      }
      if (updates.price !== undefined) {
        if (isNaN(parseFloat(updates.price))) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid price value" });
        }
        updateFields.push(`price = $${paramIndex++}`);
        values.push(parseFloat(updates.price));
      }
      if (updates.cost !== undefined) {
        updateFields.push(`cost = $${paramIndex++}`);
        values.push(updates.cost ? parseFloat(updates.cost) : 0);
      }
      if (updates.image_url !== undefined) {
        updateFields.push(`image_url = $${paramIndex++}`);
        values.push(truncate(updates.image_url || "", 500));
      }
      if (updates.is_vegetarian !== undefined) {
        updateFields.push(`is_vegetarian = $${paramIndex++}`);
        values.push(updates.is_vegetarian);
      }
      if (updates.is_vegan !== undefined) {
        updateFields.push(`is_vegan = $${paramIndex++}`);
        values.push(updates.is_vegan);
      }
      if (updates.is_gluten_free !== undefined) {
        updateFields.push(`is_gluten_free = $${paramIndex++}`);
        values.push(updates.is_gluten_free);
      }
      if (updates.is_spicy !== undefined) {
        updateFields.push(`is_spicy = $${paramIndex++}`);
        values.push(updates.is_spicy);
      }
      if (updates.is_signature !== undefined) {
        updateFields.push(`is_signature = $${paramIndex++}`);
        values.push(updates.is_signature);
      }
      if (updates.is_special !== undefined) {
        updateFields.push(`is_special = $${paramIndex++}`);
        values.push(updates.is_special);
      }
      if (updates.preparation_time !== undefined) {
        updateFields.push(`preparation_time = $${paramIndex++}`);
        values.push(
          updates.preparation_time ? parseInt(updates.preparation_time) : 0,
        );
      }
      if (updates.tax_rate !== undefined) {
        updateFields.push(`tax_rate = $${paramIndex++}`);
        values.push(updates.tax_rate ? parseFloat(updates.tax_rate) : 10.0);
      }
      if (updates.discount_allowed !== undefined) {
        updateFields.push(`discount_allowed = $${paramIndex++}`);
        values.push(updates.discount_allowed);
      }
      if (updates.track_inventory !== undefined) {
        updateFields.push(`track_inventory = $${paramIndex++}`);
        values.push(updates.track_inventory);
      }
      if (updates.stock_quantity !== undefined) {
        updateFields.push(`stock_quantity = $${paramIndex++}`);
        values.push(
          updates.stock_quantity ? parseInt(updates.stock_quantity) : 0,
        );
      }
      if (updates.reorder_level !== undefined) {
        updateFields.push(`reorder_level = $${paramIndex++}`);
        values.push(
          updates.reorder_level ? parseInt(updates.reorder_level) : 0,
        );
      }
      if (updates.is_available !== undefined) {
        updateFields.push(`is_available = $${paramIndex++}`);
        values.push(updates.is_available);
      }

      // Always update the updated_at timestamp
      updateFields.push(`updated_at = NOW()`);

      if (updateFields.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "No fields to update" });
      }

      const query = `UPDATE menu_items SET ${updateFields.join(", ")} WHERE id = $1 RETURNING *`;
      console.log("Update query:", query);
      console.log("Update values:", values);

      const result = await db.query(query, values);

      console.log("Item updated successfully:", result.rows[0]);

      res.json({
        success: true,
        message: "Menu item updated successfully",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Update menu item error:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error updating menu item",
      });
    }
  },
);

// ==================== TOGGLE AVAILABILITY ====================
router.patch(
  "/items/:id/toggle",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  async (req, res) => {
    try {
      const { id } = req.params;
      console.log("Toggling availability for item ID:", id);

      const result = await db.query(
        "UPDATE menu_items SET is_available = NOT is_available, updated_at = NOW() WHERE id = $1 RETURNING id, name, is_available",
        [id],
      );

      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Menu item not found" });
      }

      console.log("Availability toggled:", result.rows[0]);

      res.json({
        success: true,
        message: `Item ${result.rows[0].is_available ? "activated" : "deactivated"} successfully`,
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Toggle availability error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  },
);

// ==================== DELETE MENU ITEM ====================
router.delete(
  "/items/:id",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  async (req, res) => {
    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      const { id } = req.params;
      console.log("Deleting menu item ID:", id);

      // Check if item exists
      const checkItem = await client.query(
        "SELECT id, name FROM menu_items WHERE id = $1",
        [id],
      );
      if (checkItem.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Menu item not found" });
      }

      // Check if item is used in any orders
      const orderCheck = await client.query(
        "SELECT id FROM order_items WHERE menu_item_id = $1 LIMIT 1",
        [id],
      );

      if (orderCheck.rows.length > 0) {
        // Soft delete - just mark as unavailable instead of deleting
        await client.query(
          "UPDATE menu_items SET is_available = false, updated_at = NOW() WHERE id = $1",
          [id],
        );
        await client.query("COMMIT");
        return res.json({
          success: true,
          message:
            "Item has been used in orders and has been deactivated instead of deleted",
        });
      }

      // Hard delete if not used in any orders
      const result = await client.query(
        "DELETE FROM menu_items WHERE id = $1 RETURNING id, name",
        [id],
      );

      await client.query("COMMIT");

      console.log("Item deleted:", result.rows[0]);

      res.json({
        success: true,
        message: `Item "${result.rows[0].name}" deleted successfully`,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Delete menu item error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error deleting menu item",
      });
    } finally {
      client.release();
    }
  },
);

// ==================== BULK UPDATE ITEMS ====================
router.post(
  "/items/bulk",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  async (req, res) => {
    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      const { items, action } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "No items selected" });
      }

      let query;
      let message;

      switch (action) {
        case "activate":
          query =
            "UPDATE menu_items SET is_available = true, updated_at = NOW() WHERE id = ANY($1::int[])";
          message = "activated";
          break;
        case "deactivate":
          query =
            "UPDATE menu_items SET is_available = false, updated_at = NOW() WHERE id = ANY($1::int[])";
          message = "deactivated";
          break;
        default:
          return res
            .status(400)
            .json({
              success: false,
              message: 'Invalid action. Use "activate" or "deactivate"',
            });
      }

      const result = await client.query(query, [items]);

      await client.query("COMMIT");

      console.log(`Bulk ${message}:`, result.rowCount, "items");

      res.json({
        success: true,
        message: `${result.rowCount} items ${message} successfully`,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Bulk update error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error during bulk update",
      });
    } finally {
      client.release();
    }
  },
);

// ==================== GET UNIQUE CATEGORIES ====================
router.get("/categories", authenticate, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT DISTINCT category_name FROM menu_items WHERE category_name IS NOT NULL AND category_name != $1 ORDER BY category_name",
      [""],
    );
    res.json({
      success: true,
      data: result.rows.map((r) => r.category_name),
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

module.exports = router;
