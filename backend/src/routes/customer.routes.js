const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { authenticate, authorize, ROLES } = require("../middleware/auth");

// Helper function to safely truncate strings
const truncate = (str, maxLength = 255) => {
  if (!str) return "";
  return String(str).substring(0, maxLength);
};

// ==================== GET ALL CUSTOMERS ====================
router.get("/", authenticate, async (req, res) => {
  try {
    const { search, tier, isVIP } = req.query;

    let query = `
            SELECT c.*, 
                   l.points_balance,
                   l.lifetime_points,
                   l.tier,
                   p.name as program_name
            FROM customers c
            LEFT JOIN customer_loyalty l ON c.id = l.customer_id
            LEFT JOIN loyalty_programs p ON l.program_id = p.id
            WHERE 1=1
        `;
    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (c.full_name ILIKE $${paramIndex} OR c.phone ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (tier && tier !== "all") {
      query += ` AND l.tier = $${paramIndex}`;
      params.push(tier);
      paramIndex++;
    }

    if (isVIP === "true") {
      query += ` AND c.isVIP = true`;
    }

    query += " ORDER BY c.created_at DESC";

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Get customers error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Internal server error",
      });
  }
});

// ==================== GET CUSTOMER BY ID ====================
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const customerResult = await db.query(
      `
            SELECT c.*, 
                   l.points_balance,
                   l.lifetime_points,
                   l.tier,
                   p.name as program_name
            FROM customers c
            LEFT JOIN customer_loyalty l ON c.id = l.customer_id
            LEFT JOIN loyalty_programs p ON l.program_id = p.id
            WHERE c.id = $1
        `,
      [id],
    );

    if (customerResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    // Get customer's orders
    const ordersResult = await db.query(
      `
            SELECT o.*, COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.customer_id = $1
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT 10
        `,
      [id],
    );

    // Get loyalty transactions
    const loyaltyResult = await db.query(
      `
            SELECT * FROM loyalty_transactions 
            WHERE customer_id = $1 
            ORDER BY created_at DESC 
            LIMIT 20
        `,
      [id],
    );

    res.json({
      success: true,
      data: {
        ...customerResult.rows[0],
        recent_orders: ordersResult.rows,
        loyalty_transactions: loyaltyResult.rows,
      },
    });
  } catch (error) {
    console.error("Get customer error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Internal server error",
      });
  }
});

// ==================== CREATE CUSTOMER ====================
router.post("/", authenticate, async (req, res) => {
  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    const {
      phone,
      email,
      full_name,
      date_of_birth,
      anniversary_date,
      address,
      notes,
      isVIP,
    } = req.body;

    console.log("Creating customer:", { phone, email, full_name });

    // Validate required fields
    if (!full_name || full_name.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Full name is required" });
    }
    if (!phone || phone.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Phone number is required" });
    }

    // Check if customer exists with same phone or email
    let existingQuery = "SELECT id FROM customers WHERE phone = $1";
    const existingParams = [phone];

    if (email) {
      existingQuery += " OR email = $2";
      existingParams.push(email);
    }

    const existing = await client.query(existingQuery, existingParams);

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Customer with this phone or email already exists",
      });
    }

    // Insert customer
    const customerResult = await client.query(
      `INSERT INTO customers (
                phone, email, full_name, date_of_birth, anniversary_date, 
                address, notes, isVIP, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) 
            RETURNING *`,
      [
        phone,
        email || null,
        truncate(full_name, 100),
        date_of_birth || null,
        anniversary_date || null,
        address || null,
        notes || null,
        isVIP || false,
      ],
    );

    // Enroll in loyalty program (default program)
    const programResult = await client.query(
      "SELECT id FROM loyalty_programs WHERE is_active = true LIMIT 1",
    );

    if (programResult.rows.length > 0) {
      await client.query(
        `INSERT INTO customer_loyalty (
                    customer_id, program_id, points_balance, lifetime_points, tier, enrolled_at, last_updated
                ) VALUES ($1, $2, 0, 0, 'bronze', NOW(), NOW())`,
        [customerResult.rows[0].id, programResult.rows[0].id],
      );
    }

    await client.query("COMMIT");

    console.log("Customer created:", customerResult.rows[0]);

    res.status(201).json({
      success: true,
      message: "Customer added successfully",
      data: customerResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create customer error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error creating customer",
    });
  } finally {
    client.release();
  }
});

// ==================== UPDATE CUSTOMER ====================
router.put("/:id", authenticate, async (req, res) => {
  const client = await db.pool.connect();

  try {
    console.log("=".repeat(50));
    console.log("UPDATE CUSTOMER REQUEST");
    console.log("=".repeat(50));
    console.log("Customer ID:", req.params.id);
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    await client.query("BEGIN");

    const { id } = req.params;
    const {
      full_name,
      phone,
      email,
      date_of_birth,
      anniversary_date,
      address,
      notes,
      isVIP,
    } = req.body;

    // Check if customer exists
    const checkCustomer = await client.query(
      "SELECT * FROM customers WHERE id = $1",
      [id],
    );
    if (checkCustomer.rows.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    console.log("Existing customer data:", checkCustomer.rows[0]);

    // Build update query dynamically
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (full_name !== undefined) {
      updateFields.push(`full_name = $${paramIndex++}`);
      values.push(truncate(full_name, 100));
    }
    if (phone !== undefined) {
      // Check if phone is already taken by another customer
      if (phone !== checkCustomer.rows[0].phone) {
        const phoneCheck = await client.query(
          "SELECT id FROM customers WHERE phone = $1 AND id != $2",
          [phone, id],
        );
        if (phoneCheck.rows.length > 0) {
          await client.query("ROLLBACK");
          client.release();
          return res.status(400).json({
            success: false,
            message: "Phone number already in use by another customer",
          });
        }
      }
      updateFields.push(`phone = $${paramIndex++}`);
      values.push(phone);
    }
    if (email !== undefined) {
      // Check if email is already taken by another customer
      if (email && email !== checkCustomer.rows[0].email) {
        const emailCheck = await client.query(
          "SELECT id FROM customers WHERE email = $1 AND id != $2",
          [email, id],
        );
        if (emailCheck.rows.length > 0) {
          await client.query("ROLLBACK");
          client.release();
          return res.status(400).json({
            success: false,
            message: "Email already in use by another customer",
          });
        }
      }
      updateFields.push(`email = $${paramIndex++}`);
      values.push(email || null);
    }
    if (date_of_birth !== undefined) {
      updateFields.push(`date_of_birth = $${paramIndex++}`);
      values.push(date_of_birth || null);
    }
    if (anniversary_date !== undefined) {
      updateFields.push(`anniversary_date = $${paramIndex++}`);
      values.push(anniversary_date || null);
    }
    if (address !== undefined) {
      updateFields.push(`address = $${paramIndex++}`);
      values.push(address || null);
    }
    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex++}`);
      values.push(notes || null);
    }
    if (isVIP !== undefined) {
      updateFields.push(`isVIP = $${paramIndex++}`);
      values.push(isVIP);
    }

    // Always update the updated_at timestamp
    updateFields.push(`updated_at = NOW()`);

    if (updateFields.length === 1) {
      // Only updated_at was added
      await client.query("ROLLBACK");
      client.release();
      return res
        .status(400)
        .json({ success: false, message: "No fields to update" });
    }

    // Add the ID as the last parameter
    values.push(id);

    const query = `UPDATE customers SET ${updateFields.join(", ")} WHERE id = $${paramIndex} RETURNING *`;
    console.log("Update query:", query);
    console.log("Update values:", values);

    const result = await client.query(query, values);

    await client.query("COMMIT");

    console.log("Customer updated successfully:", result.rows[0]);

    res.json({
      success: true,
      message: "Customer updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("=".repeat(50));
    console.error("UPDATE CUSTOMER ERROR:");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("=".repeat(50));
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error updating customer",
    });
  } finally {
    client.release();
  }
});

// ==================== DELETE CUSTOMER ====================
router.delete(
  "/:id",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  async (req, res) => {
    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      const { id } = req.params;

      console.log(`Deleting customer ${id}`);

      // Check if customer exists
      const checkCustomer = await client.query(
        "SELECT id, full_name FROM customers WHERE id = $1",
        [id],
      );
      if (checkCustomer.rows.length === 0) {
        await client.query("ROLLBACK");
        client.release();
        return res
          .status(404)
          .json({ success: false, message: "Customer not found" });
      }

      const customerName = checkCustomer.rows[0].full_name;

      // Delete related loyalty transactions first
      await client.query(
        "DELETE FROM loyalty_transactions WHERE customer_id = $1",
        [id],
      );

      // Delete loyalty record
      await client.query(
        "DELETE FROM customer_loyalty WHERE customer_id = $1",
        [id],
      );

      // Update orders to remove customer reference
      await client.query(
        "UPDATE orders SET customer_id = NULL WHERE customer_id = $1",
        [id],
      );

      // Delete the customer
      const result = await client.query(
        "DELETE FROM customers WHERE id = $1 RETURNING id",
        [id],
      );

      await client.query("COMMIT");

      console.log("Customer deleted:", customerName);

      res.json({
        success: true,
        message: `Customer "${customerName}" deleted successfully`,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Delete customer error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error deleting customer",
      });
    } finally {
      client.release();
    }
  },
);

// ==================== ADD LOYALTY POINTS ====================
router.post("/:id/loyalty/add", authenticate, async (req, res) => {
  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    const { id } = req.params;
    const { points, description, reference_id, reference_type } = req.body;

    console.log(`Adding ${points} points to customer ${id}`);

    // Check if customer exists and has loyalty record
    const loyaltyResult = await client.query(
      "SELECT id, points_balance, lifetime_points FROM customer_loyalty WHERE customer_id = $1",
      [id],
    );

    if (loyaltyResult.rows.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      return res
        .status(404)
        .json({
          success: false,
          message: "Loyalty account not found for this customer",
        });
    }

    const loyalty = loyaltyResult.rows[0];
    const newBalance = (loyalty.points_balance || 0) + points;
    const newLifetime = (loyalty.lifetime_points || 0) + points;

    // Determine new tier based on points
    let newTier = "bronze";
    if (newLifetime >= 10000) newTier = "platinum";
    else if (newLifetime >= 5000) newTier = "gold";
    else if (newLifetime >= 1000) newTier = "silver";

    // Update loyalty points
    await client.query(
      `UPDATE customer_loyalty 
             SET points_balance = $1,
                 lifetime_points = $2,
                 tier = $3,
                 last_updated = NOW()
             WHERE customer_id = $4`,
      [newBalance, newLifetime, newTier, id],
    );

    // Record transaction
    const transactionResult = await client.query(
      `INSERT INTO loyalty_transactions (
                customer_id, points, transaction_type, description, reference_id, reference_type, created_at
            ) VALUES ($1, $2, 'earned', $3, $4, $5, NOW()) RETURNING *`,
      [
        id,
        points,
        description || "Points added",
        reference_id || null,
        reference_type || null,
      ],
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      message: `${points} points added successfully`,
      data: transactionResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Add loyalty points error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error adding points",
    });
  } finally {
    client.release();
  }
});

// ==================== REDEEM LOYALTY POINTS ====================
router.post("/:id/loyalty/redeem", authenticate, async (req, res) => {
  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    const { id } = req.params;
    const { points, description, reference_id, reference_type } = req.body;

    console.log(`Redeeming ${points} points from customer ${id}`);

    // Check if customer exists and has loyalty record
    const loyaltyResult = await client.query(
      "SELECT id, points_balance FROM customer_loyalty WHERE customer_id = $1",
      [id],
    );

    if (loyaltyResult.rows.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      return res
        .status(404)
        .json({
          success: false,
          message: "Loyalty account not found for this customer",
        });
    }

    const loyalty = loyaltyResult.rows[0];

    if ((loyalty.points_balance || 0) < points) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(400).json({
        success: false,
        message: "Insufficient points balance",
      });
    }

    const newBalance = (loyalty.points_balance || 0) - points;

    // Deduct points
    await client.query(
      `UPDATE customer_loyalty 
             SET points_balance = $1,
                 last_updated = NOW()
             WHERE customer_id = $2`,
      [newBalance, id],
    );

    // Record transaction
    const transactionResult = await client.query(
      `INSERT INTO loyalty_transactions (
                customer_id, points, transaction_type, description, reference_id, reference_type, created_at
            ) VALUES ($1, $2, 'redeemed', $3, $4, $5, NOW()) RETURNING *`,
      [
        id,
        points,
        description || "Points redeemed",
        reference_id || null,
        reference_type || null,
      ],
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      message: `${points} points redeemed successfully`,
      data: transactionResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Redeem loyalty points error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error redeeming points",
    });
  } finally {
    client.release();
  }
});

// ==================== CREATE RESERVATION ====================
router.post("/reservations", authenticate, async (req, res) => {
  try {
    const {
      customer_id,
      table_id,
      reservation_date,
      reservation_time,
      guest_count,
      special_requests,
    } = req.body;

    // Check if table is available
    const tableCheck = await db.query(
      `SELECT * FROM reservations 
             WHERE table_id = $1 
               AND reservation_date = $2 
               AND reservation_time = $3 
               AND status != 'cancelled'`,
      [table_id, reservation_date, reservation_time],
    );

    if (tableCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Table already reserved for this time",
      });
    }

    const result = await db.query(
      `INSERT INTO reservations (
                customer_id, table_id, reservation_date, reservation_time, 
                guest_count, special_requests, created_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) 
            RETURNING *`,
      [
        customer_id,
        table_id,
        reservation_date,
        reservation_time,
        guest_count,
        special_requests,
        req.user.id,
      ],
    );

    res.status(201).json({
      success: true,
      message: "Reservation created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Create reservation error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

// ==================== GET RESERVATIONS ====================
router.get("/reservations/list", authenticate, async (req, res) => {
  try {
    const { date, status } = req.query;

    let query = `
            SELECT r.*, 
                   c.full_name as customer_name,
                   c.phone as customer_phone,
                   t.table_number
            FROM reservations r
            JOIN customers c ON r.customer_id = c.id
            JOIN tables t ON r.table_id = t.id
            WHERE 1=1
        `;
    const params = [];
    let paramIndex = 1;

    if (date) {
      query += ` AND r.reservation_date = $${paramIndex}`;
      params.push(date);
      paramIndex++;
    }

    if (status) {
      query += ` AND r.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += " ORDER BY r.reservation_date, r.reservation_time";

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Get reservations error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

// ==================== UPDATE RESERVATION STATUS ====================
router.patch("/reservations/:id/status", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await db.query(
      `UPDATE reservations 
             SET status = $1, updated_at = NOW() 
             WHERE id = $2 RETURNING *`,
      [status, id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Reservation not found" });
    }

    res.json({
      success: true,
      message: "Reservation status updated",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update reservation status error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

module.exports = router;
