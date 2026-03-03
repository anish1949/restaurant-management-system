const express = require("express");
const router = express.Router();
const db = require("../config/database");
const bcrypt = require("bcrypt");
const { authenticate, authorize, ROLES } = require("../middleware/auth");

// Helper function to safely truncate strings
const truncate = (str, maxLength = 255) => {
  if (!str) return "";
  return String(str).substring(0, maxLength);
};

// ==================== GET ALL STAFF ====================
router.get(
  "/",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  async (req, res) => {
    try {
      console.log("Fetching all staff members...");

      const query = `
            SELECT u.id, u.username, u.email, u.full_name, u.phone, 
                   u.address, u.emergency_contact, u.emergency_phone,
                   u.role_id, u.department_id, u.hourly_rate, u.employment_type,
                   u.hire_date, u.is_active, u.last_login, u.created_at,
                   r.name as role_name, d.name as department_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN staff_departments d ON u.department_id = d.id
            ORDER BY u.full_name
        `;

      const result = await db.query(query);
      console.log(`Found ${result.rows.length} staff members`);

      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error("Get staff error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error loading staff",
      });
    }
  },
);

// ==================== GET SINGLE STAFF MEMBER ====================
router.get(
  "/:id",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Fetching staff member with ID: ${id}`);

      const query = `
            SELECT u.id, u.username, u.email, u.full_name, u.phone, 
                   u.address, u.emergency_contact, u.emergency_phone,
                   u.role_id, u.department_id, u.hourly_rate, u.employment_type,
                   u.hire_date, u.is_active, u.last_login, u.created_at,
                   r.name as role_name, d.name as department_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN staff_departments d ON u.department_id = d.id
            WHERE u.id = $1
        `;

      const result = await db.query(query, [id]);

      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Staff member not found" });
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Get staff member error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error loading staff member",
      });
    }
  },
);

// ==================== CREATE STAFF MEMBER ====================
router.post(
  "/",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  async (req, res) => {
    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      const {
        username,
        password,
        email,
        full_name,
        phone,
        address,
        emergency_contact,
        emergency_phone,
        role_id,
        department_id,
        hourly_rate,
        employment_type,
        hire_date,
        is_active,
      } = req.body;

      console.log("Creating new staff member:", { username, email, full_name });

      // Validate required fields
      if (!username || username.trim() === "") {
        return res
          .status(400)
          .json({ success: false, message: "Username is required" });
      }
      if (!password || password.trim() === "") {
        return res
          .status(400)
          .json({ success: false, message: "Password is required" });
      }
      if (!email || email.trim() === "") {
        return res
          .status(400)
          .json({ success: false, message: "Email is required" });
      }
      if (!full_name || full_name.trim() === "") {
        return res
          .status(400)
          .json({ success: false, message: "Full name is required" });
      }

      // Check if username already exists
      const usernameCheck = await client.query(
        "SELECT id FROM users WHERE username = $1",
        [username],
      );
      if (usernameCheck.rows.length > 0) {
        return res
          .status(400)
          .json({ success: false, message: "Username already exists" });
      }

      // Check if email already exists
      const emailCheck = await client.query(
        "SELECT id FROM users WHERE email = $1",
        [email],
      );
      if (emailCheck.rows.length > 0) {
        return res
          .status(400)
          .json({ success: false, message: "Email already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert new user
      const result = await client.query(
        `INSERT INTO users (
                username, password_hash, email, full_name, phone,
                address, emergency_contact, emergency_phone,
                role_id, department_id, hourly_rate, employment_type,
                hire_date, is_active, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
            RETURNING id, username, email, full_name, role_id, created_at`,
        [
          username,
          hashedPassword,
          email,
          truncate(full_name, 100),
          phone || null,
          address || null,
          emergency_contact || null,
          emergency_phone || null,
          role_id || 4,
          department_id || null,
          hourly_rate ? parseFloat(hourly_rate) : 0,
          employment_type || "full-time",
          hire_date || null,
          is_active !== false,
        ],
      );

      await client.query("COMMIT");

      console.log("Staff member created:", result.rows[0]);

      res.status(201).json({
        success: true,
        message: "Staff member created successfully",
        data: result.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Create staff error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error creating staff member",
      });
    } finally {
      client.release();
    }
  },
);

// ==================== UPDATE STAFF MEMBER ====================
router.put(
  "/:id",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      console.log(`Updating staff member ${id}:`, updates);

      // Check if user exists
      const checkUser = await db.query("SELECT id FROM users WHERE id = $1", [
        id,
      ]);
      if (checkUser.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Staff member not found" });
      }

      // Build update query dynamically
      const updateFields = [];
      const values = [id];
      let paramIndex = 2;

      if (updates.email !== undefined) {
        if (updates.email) {
          const emailCheck = await db.query(
            "SELECT id FROM users WHERE email = $1 AND id != $2",
            [updates.email, id],
          );
          if (emailCheck.rows.length > 0) {
            return res
              .status(400)
              .json({ success: false, message: "Email already in use" });
          }
        }
        updateFields.push(`email = $${paramIndex++}`);
        values.push(updates.email || null);
      }
      if (updates.full_name !== undefined) {
        updateFields.push(`full_name = $${paramIndex++}`);
        values.push(truncate(updates.full_name, 100));
      }
      if (updates.phone !== undefined) {
        updateFields.push(`phone = $${paramIndex++}`);
        values.push(updates.phone || null);
      }
      if (updates.address !== undefined) {
        updateFields.push(`address = $${paramIndex++}`);
        values.push(updates.address || null);
      }
      if (updates.emergency_contact !== undefined) {
        updateFields.push(`emergency_contact = $${paramIndex++}`);
        values.push(updates.emergency_contact || null);
      }
      if (updates.emergency_phone !== undefined) {
        updateFields.push(`emergency_phone = $${paramIndex++}`);
        values.push(updates.emergency_phone || null);
      }
      if (updates.role_id !== undefined) {
        updateFields.push(`role_id = $${paramIndex++}`);
        values.push(updates.role_id || 4);
      }
      if (updates.department_id !== undefined) {
        updateFields.push(`department_id = $${paramIndex++}`);
        values.push(updates.department_id || null);
      }
      if (updates.hourly_rate !== undefined) {
        updateFields.push(`hourly_rate = $${paramIndex++}`);
        values.push(updates.hourly_rate ? parseFloat(updates.hourly_rate) : 0);
      }
      if (updates.employment_type !== undefined) {
        updateFields.push(`employment_type = $${paramIndex++}`);
        values.push(updates.employment_type || "full-time");
      }
      if (updates.hire_date !== undefined) {
        updateFields.push(`hire_date = $${paramIndex++}`);
        values.push(updates.hire_date || null);
      }
      if (updates.is_active !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        values.push(updates.is_active);
      }
      if (updates.password !== undefined && updates.password.trim() !== "") {
        const hashedPassword = await bcrypt.hash(updates.password, 10);
        updateFields.push(`password_hash = $${paramIndex++}`);
        values.push(hashedPassword);
      }

      // Always update the updated_at timestamp
      updateFields.push(`updated_at = NOW()`);

      if (updateFields.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "No fields to update" });
      }

      const query = `UPDATE users SET ${updateFields.join(", ")} WHERE id = $1 RETURNING id, username, email, full_name, role_id`;
      console.log("Update query:", query);
      console.log("Update values:", values);

      const result = await db.query(query, values);

      console.log("Staff member updated:", result.rows[0]);

      res.json({
        success: true,
        message: "Staff member updated successfully",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Update staff error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error updating staff member",
      });
    }
  },
);

// ==================== DELETE STAFF MEMBER ====================
router.delete(
  "/:id",
  authenticate,
  authorize(ROLES.ADMIN),
  async (req, res) => {
    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      const { id } = req.params;

      // Check if user exists
      const checkUser = await client.query(
        "SELECT id, full_name FROM users WHERE id = $1",
        [id],
      );
      if (checkUser.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Staff member not found" });
      }

      // Don't allow deleting yourself
      if (parseInt(id) === req.user.id) {
        return res
          .status(400)
          .json({ success: false, message: "Cannot delete your own account" });
      }

      // Delete related records first
      await client.query("DELETE FROM staff_schedules WHERE user_id = $1", [
        id,
      ]);
      await client.query("DELETE FROM staff_time_tracking WHERE user_id = $1", [
        id,
      ]);
      await client.query("DELETE FROM staff_performance WHERE user_id = $1", [
        id,
      ]);

      // Delete the user
      const result = await client.query(
        "DELETE FROM users WHERE id = $1 RETURNING id, full_name",
        [id],
      );

      await client.query("COMMIT");

      console.log("Staff member deleted:", result.rows[0]);
      res.json({
        success: true,
        message: `Staff member "${result.rows[0].full_name}" deleted successfully`,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Delete staff error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error deleting staff member",
      });
    } finally {
      client.release();
    }
  },
);

// ==================== GET DEPARTMENTS ====================
router.get("/departments/list", authenticate, async (req, res) => {
  try {
    console.log("Fetching departments list...");

    const tableCheck = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'staff_departments'
            );
        `);

    if (!tableCheck.rows[0].exists) {
      return res.json({
        success: true,
        data: [
          { id: 1, name: "Management" },
          { id: 2, name: "Kitchen" },
          { id: 3, name: "Service" },
          { id: 4, name: "Bar" },
          { id: 5, name: "Host" },
          { id: 6, name: "Cleaning" },
        ],
      });
    }

    const result = await db.query(
      "SELECT * FROM staff_departments ORDER BY name",
    );
    console.log(`Found ${result.rows.length} departments`);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Get departments error:", error);
    res.json({
      success: true,
      data: [
        { id: 1, name: "Management" },
        { id: 2, name: "Kitchen" },
        { id: 3, name: "Service" },
        { id: 4, name: "Bar" },
        { id: 5, name: "Host" },
        { id: 6, name: "Cleaning" },
      ],
    });
  }
});

// ==================== GET ROLES ====================
router.get("/roles/list", authenticate, async (req, res) => {
  try {
    console.log("Fetching roles list...");

    const tableCheck = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'roles'
            );
        `);

    if (!tableCheck.rows[0].exists) {
      return res.json({
        success: true,
        data: [
          { id: 1, name: "Admin" },
          { id: 2, name: "Manager" },
          { id: 3, name: "Cashier" },
          { id: 4, name: "Waiter" },
          { id: 5, name: "Kitchen" },
        ],
      });
    }

    const result = await db.query("SELECT * FROM roles ORDER BY name");
    console.log(`Found ${result.rows.length} roles`);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Get roles error:", error);
    res.json({
      success: true,
      data: [
        { id: 1, name: "Admin" },
        { id: 2, name: "Manager" },
        { id: 3, name: "Cashier" },
        { id: 4, name: "Waiter" },
        { id: 5, name: "Kitchen" },
      ],
    });
  }
});

// ==================== SCHEDULE MANAGEMENT ====================

// Get all schedules
router.get(
  "/schedules/all",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  async (req, res) => {
    try {
      const result = await db.query(`
            SELECT s.*, 
                   u.full_name, 
                   u.username,
                   CASE 
                       WHEN s.day_of_week = 0 THEN 'Sunday'
                       WHEN s.day_of_week = 1 THEN 'Monday'
                       WHEN s.day_of_week = 2 THEN 'Tuesday'
                       WHEN s.day_of_week = 3 THEN 'Wednesday'
                       WHEN s.day_of_week = 4 THEN 'Thursday'
                       WHEN s.day_of_week = 5 THEN 'Friday'
                       WHEN s.day_of_week = 6 THEN 'Saturday'
                   END as day_name
            FROM staff_schedules s
            JOIN users u ON s.user_id = u.id
            ORDER BY u.full_name, s.day_of_week, s.start_time
        `);

      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error("Get schedules error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error loading schedules",
      });
    }
  },
);

// Get schedules for a specific staff member
router.get("/schedules/user/:userId", authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await db.query(
      `
            SELECT s.*,
                   CASE 
                       WHEN s.day_of_week = 0 THEN 'Sunday'
                       WHEN s.day_of_week = 1 THEN 'Monday'
                       WHEN s.day_of_week = 2 THEN 'Tuesday'
                       WHEN s.day_of_week = 3 THEN 'Wednesday'
                       WHEN s.day_of_week = 4 THEN 'Thursday'
                       WHEN s.day_of_week = 5 THEN 'Friday'
                       WHEN s.day_of_week = 6 THEN 'Saturday'
                   END as day_name
            FROM staff_schedules s
            WHERE s.user_id = $1
            ORDER BY s.day_of_week, s.start_time
        `,
      [userId],
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Get user schedules error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

// Create schedule
router.post(
  "/schedules",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  async (req, res) => {
    try {
      const { user_id, day_of_week, start_time, end_time, is_break } = req.body;

      if (!user_id || day_of_week === undefined || !start_time || !end_time) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }

      const userCheck = await db.query("SELECT id FROM users WHERE id = $1", [
        user_id,
      ]);
      if (userCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const overlapCheck = await db.query(
        `
            SELECT id FROM staff_schedules 
            WHERE user_id = $1 
            AND day_of_week = $2
            AND NOT (end_time <= $3 OR start_time >= $4)
        `,
        [user_id, day_of_week, start_time, end_time],
      );

      if (overlapCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Schedule overlaps with existing schedule",
        });
      }

      const result = await db.query(
        `INSERT INTO staff_schedules (
                user_id, day_of_week, start_time, end_time, is_break, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) 
            RETURNING *`,
        [user_id, day_of_week, start_time, end_time, is_break || false],
      );

      res.status(201).json({
        success: true,
        message: "Schedule created successfully",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Create schedule error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error creating schedule",
      });
    }
  },
);

// Update schedule
router.put(
  "/schedules/:id",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { day_of_week, start_time, end_time, is_break } = req.body;

      const result = await db.query(
        `UPDATE staff_schedules 
             SET day_of_week = COALESCE($1, day_of_week),
                 start_time = COALESCE($2, start_time),
                 end_time = COALESCE($3, end_time),
                 is_break = COALESCE($4, is_break),
                 updated_at = NOW()
             WHERE id = $5
             RETURNING *`,
        [day_of_week, start_time, end_time, is_break, id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Schedule not found",
        });
      }

      res.json({
        success: true,
        message: "Schedule updated successfully",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Update schedule error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error updating schedule",
      });
    }
  },
);

// Delete schedule
router.delete(
  "/schedules/:id",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await db.query(
        "DELETE FROM staff_schedules WHERE id = $1 RETURNING id",
        [id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Schedule not found",
        });
      }

      res.json({
        success: true,
        message: "Schedule deleted successfully",
      });
    } catch (error) {
      console.error("Delete schedule error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error deleting schedule",
      });
    }
  },
);

// ==================== PERFORMANCE MANAGEMENT ====================

// Get all performance reviews
router.get(
  "/performance/all",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  async (req, res) => {
    try {
      const result = await db.query(`
            SELECT p.*, 
                   u.full_name as user_name,
                   u.username,
                   r.full_name as reviewer_name
            FROM staff_performance p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN users r ON p.reviewer_id = r.id
            ORDER BY p.review_date DESC
        `);

      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error("Get performance reviews error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  },
);

// Get performance reviews for a specific staff member
router.get("/performance/user/:userId", authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await db.query(
      `
            SELECT p.*, 
                   r.full_name as reviewer_name
            FROM staff_performance p
            LEFT JOIN users r ON p.reviewer_id = r.id
            WHERE p.user_id = $1
            ORDER BY p.review_date DESC
        `,
      [userId],
    );

    const avgResult = await db.query(
      `
            SELECT COALESCE(AVG(rating), 0) as average_rating,
                   COUNT(*) as total_reviews
            FROM staff_performance
            WHERE user_id = $1
        `,
      [userId],
    );

    res.json({
      success: true,
      data: {
        reviews: result.rows,
        stats: avgResult.rows[0],
      },
    });
  } catch (error) {
    console.error("Get user performance error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

// Create performance review
router.post(
  "/performance",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  async (req, res) => {
    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      const { user_id, review_date, rating, feedback, metrics } = req.body;

      console.log("Creating performance review:", {
        user_id,
        review_date,
        rating,
      });

      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      if (!review_date) {
        return res.status(400).json({
          success: false,
          message: "Review date is required",
        });
      }

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be between 1 and 5",
        });
      }

      const userCheck = await client.query(
        "SELECT id FROM users WHERE id = $1",
        [user_id],
      );

      if (userCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const metricsJson = metrics
        ? JSON.stringify(metrics)
        : JSON.stringify({
            orders_processed: 0,
            sales_amount: 0,
            customer_rating: 0,
            attendance_percentage: 100,
          });

      const result = await client.query(
        `INSERT INTO staff_performance (
                user_id, review_date, rating, feedback, metrics, reviewer_id, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
            RETURNING *`,
        [
          user_id,
          review_date,
          rating,
          feedback || null,
          metricsJson,
          req.user.id,
        ],
      );

      await client.query("COMMIT");

      console.log("Performance review created:", result.rows[0]);

      res.status(201).json({
        success: true,
        message: "Performance review created successfully",
        data: result.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Create performance review error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error creating review",
      });
    } finally {
      client.release();
    }
  },
);

// Update performance review
router.put(
  "/performance/:id",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { review_date, rating, feedback, metrics } = req.body;

      if (rating && (rating < 1 || rating > 5)) {
        return res.status(400).json({
          success: false,
          message: "Rating must be between 1 and 5",
        });
      }

      const updates = [];
      const values = [id];
      let paramIndex = 2;

      if (review_date) {
        updates.push(`review_date = $${paramIndex++}`);
        values.push(review_date);
      }
      if (rating) {
        updates.push(`rating = $${paramIndex++}`);
        values.push(rating);
      }
      if (feedback !== undefined) {
        updates.push(`feedback = $${paramIndex++}`);
        values.push(feedback || null);
      }
      if (metrics) {
        updates.push(`metrics = $${paramIndex++}`);
        values.push(JSON.stringify(metrics));
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No fields to update",
        });
      }

      const query = `UPDATE staff_performance SET ${updates.join(", ")} WHERE id = $1 RETURNING *`;

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Performance review not found",
        });
      }

      res.json({
        success: true,
        message: "Performance review updated successfully",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Update performance review error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error updating review",
      });
    }
  },
);

// Delete performance review
router.delete(
  "/performance/:id",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await db.query(
        "DELETE FROM staff_performance WHERE id = $1 RETURNING id",
        [id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Performance review not found",
        });
      }

      res.json({
        success: true,
        message: "Performance review deleted successfully",
      });
    } catch (error) {
      console.error("Delete performance review error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error deleting review",
      });
    }
  },
);

// Get performance summary for all staff
router.get(
  "/performance/summary",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  async (req, res) => {
    try {
      const result = await db.query(`
            SELECT 
                u.id,
                u.full_name,
                u.username,
                COUNT(p.id) as review_count,
                COALESCE(AVG(p.rating), 0) as average_rating,
                MAX(p.review_date) as last_review_date,
                COALESCE(SUM((p.metrics->>'orders_processed')::int), 0) as total_orders,
                COALESCE(SUM((p.metrics->>'sales_amount')::numeric), 0) as total_sales
            FROM users u
            LEFT JOIN staff_performance p ON u.id = p.user_id
            WHERE u.role_id IN (3, 4, 5)
            GROUP BY u.id, u.full_name, u.username
            ORDER BY average_rating DESC NULLS LAST
        `);

      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error("Get performance summary error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  },
);

// ==================== TIME TRACKING ====================

// Clock in
router.post("/clock-in", authenticate, async (req, res) => {
  try {
    const { user_id } = req.body;
    const userId = user_id || req.user.id;

    const activeClock = await db.query(
      `SELECT id FROM staff_time_tracking 
             WHERE user_id = $1 AND clock_out IS NULL AND status = 'active'`,
      [userId],
    );

    if (activeClock.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Already clocked in",
      });
    }

    const result = await db.query(
      `INSERT INTO staff_time_tracking (user_id, clock_in, status, created_at) 
             VALUES ($1, NOW(), 'active', NOW()) RETURNING *`,
      [userId],
    );

    res.json({
      success: true,
      message: "Clocked in successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Clock in error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error clocking in",
    });
  }
});

// Clock out
router.post("/clock-out", authenticate, async (req, res) => {
  try {
    const { id } = req.body;

    const result = await db.query(
      `UPDATE staff_time_tracking 
             SET clock_out = NOW(), 
                 total_hours = EXTRACT(EPOCH FROM (NOW() - clock_in))/3600,
                 status = 'completed',
                 updated_at = NOW()
             WHERE id = $1 AND status = 'active'
             RETURNING *`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Active clock-in record not found",
      });
    }

    res.json({
      success: true,
      message: "Clocked out successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Clock out error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error clocking out",
    });
  }
});

// Get clocked in staff
router.get("/clocked-in/list", authenticate, async (req, res) => {
  try {
    const result = await db.query(`
            SELECT t.*, u.full_name, u.username 
            FROM staff_time_tracking t
            JOIN users u ON t.user_id = u.id
            WHERE t.clock_out IS NULL AND t.status = 'active'
            ORDER BY t.clock_in DESC
        `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Get clocked in staff error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

module.exports = router;
