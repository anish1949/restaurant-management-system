const { pool } = require("../config/database");
require("dotenv").config();

async function populateMenuFromList() {
  try {
    console.log("🍽️  Starting menu population...");

    // Clear existing data
    console.log("Clearing existing menu data...");
    await pool.query("DELETE FROM menu_items");

    console.log("\n📝 Adding menu items...");

    const menuItems = [
      // 🥞 Breakfast
      {
        category: "🥞 Breakfast",
        name: "Plain Toast - Plain",
        price: 120,
        veg: true,
        prep_time: 10,
      },
      {
        category: "🥞 Breakfast",
        name: "Plain Toast - Egg",
        price: 180,
        veg: false,
        prep_time: 15,
      },
      {
        category: "🥞 Breakfast",
        name: "Plain Toast - Butter & Jam",
        price: 150,
        veg: true,
        prep_time: 10,
      },
      {
        category: "🥞 Breakfast",
        name: "Egg - Boiled",
        price: 100,
        veg: false,
        prep_time: 10,
      },
      {
        category: "🥞 Breakfast",
        name: "Egg - Poached",
        price: 120,
        veg: false,
        prep_time: 10,
      },
      {
        category: "🥞 Breakfast",
        name: "Egg - Masala Omelette",
        price: 180,
        veg: false,
        spicy: true,
        prep_time: 15,
      },
      {
        category: "🥞 Breakfast",
        name: "Sausage - Buff",
        price: 220,
        veg: false,
        prep_time: 15,
      },
      {
        category: "🥞 Breakfast",
        name: "Sausage - Chicken",
        price: 250,
        veg: false,
        prep_time: 15,
      },

      // 🍜 Noodles & Rice
      {
        category: "🍜 Noodles & Rice",
        name: "Chowmein - Veg",
        price: 180,
        veg: true,
        prep_time: 15,
      },
      {
        category: "🍜 Noodles & Rice",
        name: "Chowmein - Buff",
        price: 250,
        veg: false,
        prep_time: 15,
      },
      {
        category: "🍜 Noodles & Rice",
        name: "Chowmein - Chicken",
        price: 250,
        veg: false,
        prep_time: 15,
      },
      {
        category: "🍜 Noodles & Rice",
        name: "Chowmein - Pork",
        price: 280,
        veg: false,
        prep_time: 15,
      },
      {
        category: "🍜 Noodles & Rice",
        name: "Chowmein - Mix",
        price: 320,
        veg: false,
        prep_time: 20,
      },
      {
        category: "🍜 Noodles & Rice",
        name: "Fried Rice - Veg",
        price: 180,
        veg: true,
        prep_time: 15,
      },
      {
        category: "🍜 Noodles & Rice",
        name: "Fried Rice - Buff",
        price: 250,
        veg: false,
        prep_time: 15,
      },
      {
        category: "🍜 Noodles & Rice",
        name: "Fried Rice - Chicken",
        price: 250,
        veg: false,
        prep_time: 15,
      },
      {
        category: "🍜 Noodles & Rice",
        name: "Fried Rice - Pork",
        price: 280,
        veg: false,
        prep_time: 15,
      },
      {
        category: "🍜 Noodles & Rice",
        name: "Fried Rice - Mix",
        price: 320,
        veg: false,
        prep_time: 20,
      },
      {
        category: "🍜 Noodles & Rice",
        name: "Thukpa - Veg",
        price: 200,
        veg: true,
        prep_time: 15,
      },
      {
        category: "🍜 Noodles & Rice",
        name: "Thukpa - Buff",
        price: 280,
        veg: false,
        prep_time: 15,
      },
      {
        category: "🍜 Noodles & Rice",
        name: "Thukpa - Chicken",
        price: 280,
        veg: false,
        prep_time: 15,
      },
      {
        category: "🍜 Noodles & Rice",
        name: "Thukpa - Pork",
        price: 300,
        veg: false,
        prep_time: 15,
      },

      // Add all other items following the same pattern...
    ];

    // Insert all menu items
    let itemCount = 0;
    for (const item of menuItems) {
      await pool.query(
        `INSERT INTO menu_items (
                    category_name,
                    name,
                    price,
                    is_vegetarian,
                    is_spicy,
                    is_signature,
                    preparation_time,
                    is_available,
                    tax_rate,
                    discount_allowed,
                    track_inventory,
                    cost,
                    is_vegan,
                    is_gluten_free,
                    is_special
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          item.category,
          item.name,
          item.price,
          item.veg || false,
          item.spicy || false,
          item.signature || false,
          item.prep_time || 10,
          true,
          10.0,
          true,
          false,
          0,
          false,
          false,
          false,
        ],
      );
      itemCount++;
      if (itemCount % 20 === 0) {
        console.log(`✅ Added ${itemCount} items...`);
      }
    }

    console.log(`\n🎉 Success! Added ${itemCount} menu items`);

    // Verify the data
    const verifyItems = await pool.query("SELECT COUNT(*) FROM menu_items");
    console.log(`\n📊 Database Stats:`);
    console.log(`   Menu Items: ${verifyItems.rows[0].count}`);
  } catch (error) {
    console.error("❌ Error populating menu:", error);
  } finally {
    await pool.end();
  }
}

populateMenuFromList();
