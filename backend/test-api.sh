#!/bin/bash

echo "🚀 Testing Restaurant Management System API"
echo "==========================================="

# Base URL
BASE_URL="http://localhost:5000/api"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Login and get token
echo -e "\n${YELLOW}1. Testing Login${NC}"
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✓ Login successful${NC}"
    echo "Token: ${TOKEN:0:20}..."
else
    echo -e "${RED}✗ Login failed${NC}"
    echo $LOGIN_RESPONSE
    exit 1
fi

# Test Health endpoint
echo -e "\n${YELLOW}2. Testing Health Endpoint${NC}"
HEALTH_RESPONSE=$(curl -s $BASE_URL/../health)
if [[ $HEALTH_RESPONSE == *"OK"* ]]; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}✗ Health check failed${NC}"
fi

# Test Get Menu Items
echo -e "\n${YELLOW}3. Testing Get Menu Items${NC}"
MENU_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/menu/items)
if [[ $MENU_RESPONSE == *"success"* ]]; then
    echo -e "${GREEN}✓ Menu items retrieved${NC}"
    echo "Sample items:"
    echo $MENU_RESPONSE | grep -o '"name":"[^"]*' | head -3 | sed 's/"name":"/  - /'
else
    echo -e "${RED}✗ Failed to get menu items${NC}"
fi

# Test Get Tables
echo -e "\n${YELLOW}4. Testing Get Tables${NC}"
TABLES_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/tables)
if [[ $TABLES_RESPONSE == *"success"* ]]; then
    echo -e "${GREEN}✓ Tables retrieved${NC}"
    TABLE_COUNT=$(echo $TABLES_RESPONSE | grep -o '"table_number"' | wc -l)
    echo "  Found $TABLE_COUNT tables"
else
    echo -e "${RED}✗ Failed to get tables${NC}"
fi

# Test Get Categories
echo -e "\n${YELLOW}5. Testing Get Categories${NC}"
CATEGORIES_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/menu/categories)
if [[ $CATEGORIES_RESPONSE == *"success"* ]]; then
    echo -e "${GREEN}✓ Categories retrieved${NC}"
else
    echo -e "${RED}✗ Failed to get categories${NC}"
fi

# Test Create Order
echo -e "\n${YELLOW}6. Testing Create Order${NC}"
ORDER_RESPONSE=$(curl -s -X POST $BASE_URL/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "table_id": 1,
    "order_type": "dine-in",
    "items": [
      {
        "menu_item_id": 1,
        "quantity": 2,
        "notes": "Extra crispy"
      }
    ],
    "special_instructions": "No onions"
  }')

if [[ $ORDER_RESPONSE == *"success"* ]]; then
    echo -e "${GREEN}✓ Order created successfully${NC}"
    ORDER_ID=$(echo $ORDER_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
    echo "  Order ID: $ORDER_ID"
else
    echo -e "${RED}✗ Failed to create order${NC}"
    echo $ORDER_RESPONSE
fi

# Test Daily Sales Report
echo -e "\n${YELLOW}7. Testing Daily Sales Report${NC}"
REPORT_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/reports/daily-sales)
if [[ $REPORT_RESPONSE == *"success"* ]]; then
    echo -e "${GREEN}✓ Report retrieved${NC}"
else
    echo -e "${RED}✗ Failed to get report${NC}"
fi

# Test Get Users (Admin only)
echo -e "\n${YELLOW}8. Testing Get Users${NC}"
USERS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/users)
if [[ $USERS_RESPONSE == *"success"* ]]; then
    echo -e "${GREEN}✓ Users retrieved${NC}"
else
    echo -e "${RED}✗ Failed to get users${NC}"
fi

echo -e "\n${GREEN}===========================================${NC}"
echo -e "${GREEN}✅ API Testing Complete!${NC}"
echo -e "${GREEN}===========================================${NC}"
