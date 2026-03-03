import React, { useState, useEffect, useRef } from "react";
import { tableAPI, menuAPI, orderAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import {
  PlusIcon,
  MinusIcon,
  TrashIcon,
  CreditCardIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  MapPinIcon,
  ClockIcon,
  ReceiptPercentIcon,
  TagIcon,
  PrinterIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

// Helper function to safely parse numbers
const safeNumber = (value) => {
  if (value === null || value === undefined) return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
};

// Helper function to format currency
const formatCurrency = (value) => {
  const num = safeNumber(value);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

// Helper function to format date for printing
const formatDateTime = () => {
  const now = new Date();
  return now.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const TablePOS = () => {
  const { user } = useAuth();
  const [tables, setTables] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printData, setPrintData] = useState(null);
  const [printType, setPrintType] = useState("kot"); // 'kot' or 'bill'
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [orderNote, setOrderNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedSection, setSelectedSection] = useState("all");
  const [sections, setSections] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [lastOrder, setLastOrder] = useState(null);

  // Tax and Discount states
  const [applyTax, setApplyTax] = useState(true);
  const [discount, setDiscount] = useState({
    type: "percentage",
    value: 0,
    reason: "",
  });

  const [newTable, setNewTable] = useState({
    table_number: "",
    capacity: 4,
    min_capacity: 1,
    shape: "round",
    section: "Main",
    location: "",
  });

  // Print refs
  const printFrameRef = useRef(null);

  // Get unique categories from menu
  const categories = [
    "all",
    ...new Set(menuItems.map((item) => item.category_name).filter(Boolean)),
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tablesRes, menuRes] = await Promise.all([
        tableAPI.getTables(),
        menuAPI.getItems({ available: true }),
      ]);

      setTables(tablesRes.data.data || []);
      setMenuItems(menuRes.data.data || []);

      try {
        const sectionsRes = await tableAPI.getSections();
        setSections(sectionsRes.data.data || []);
      } catch (sectionError) {
        console.log("Sections not available, using default");
        setSections(["Main", "Window", "Bar", "Outdoor", "Private"]);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load data");
    }
  };

  const filteredTables = tables.filter((table) => {
    const matchesStatus =
      filterStatus === "all" || table.status === filterStatus;
    const matchesSection =
      selectedSection === "all" || table.section === selectedSection;
    return matchesStatus && matchesSection;
  });

  const filteredItems = menuItems.filter(
    (item) =>
      item.is_available &&
      (selectedCategory === "all" || item.category_name === selectedCategory) &&
      item.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleTableClick = (table) => {
    setSelectedTable(table);
    if (table.status === "occupied" && table.current_order_id) {
      loadTableOrder(table);
    } else {
      setCart([]);
      setOrderNote("");
      setDiscount({ type: "percentage", value: 0, reason: "" });
      setApplyTax(true);
    }
    setShowOrderModal(true);
  };

  const loadTableOrder = async (table) => {
    try {
      const response = await tableAPI.getTable(table.id);
      if (response.data.data.current_order) {
        const orderItems = response.data.data.current_order.items.map(
          (item) => ({
            id: item.menu_item_id,
            name: item.name,
            price: safeNumber(item.unit_price),
            quantity: safeNumber(item.quantity),
            note: item.notes || "",
          }),
        );
        setCart(orderItems);
      }
    } catch (error) {
      console.error("Failed to load table order:", error);
      toast.error("Failed to load order");
    }
  };

  const addToCart = (item) => {
    const existing = cart.find((i) => i.id === item.id);
    if (existing) {
      setCart(
        cart.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
        ),
      );
      toast.success(`Added another ${item.name}`, { duration: 1000 });
    } else {
      setCart([
        ...cart,
        {
          ...item,
          quantity: 1,
          note: "",
          price: safeNumber(item.price),
        },
      ]);
      toast.success(`${item.name} added to cart`, { duration: 1000 });
    }
  };

  const updateQuantity = (id, delta) => {
    const item = cart.find((i) => i.id === id);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty < 1) {
      setCart(cart.filter((i) => i.id !== id));
      toast.success("Item removed", { duration: 1000 });
    } else {
      setCart(cart.map((i) => (i.id === id ? { ...i, quantity: newQty } : i)));
    }
  };

  const updateItemNote = (id, note) => {
    setCart(cart.map((i) => (i.id === id ? { ...i, note } : i)));
  };

  const removeFromCart = (id) => {
    setCart(cart.filter((i) => i.id !== id));
    toast.success("Item removed", { duration: 1000 });
  };

  const calculateSubtotal = () => {
    return cart.reduce(
      (sum, item) => sum + safeNumber(item.price) * safeNumber(item.quantity),
      0,
    );
  };

  const calculateTax = () => {
    if (!applyTax) return 0;
    return calculateSubtotal() * 0.1; // 10% tax
  };

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    const discountValue = safeNumber(discount.value);

    if (discountValue <= 0) return 0;

    if (discount.type === "percentage") {
      return subtotal * (Math.min(discountValue, 100) / 100);
    } else {
      return Math.min(discountValue, subtotal);
    }
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() - calculateDiscount();
  };

  const handleApplyDiscount = () => {
    if (discount.value <= 0) {
      toast.error("Please enter a valid discount value");
      return;
    }

    if (discount.type === "percentage" && discount.value > 100) {
      toast.error("Percentage discount cannot exceed 100%");
      return;
    }

    if (discount.type === "amount" && discount.value > calculateSubtotal()) {
      toast.error("Amount discount cannot exceed subtotal");
      return;
    }

    setShowDiscountModal(false);
    toast.success("Discount applied successfully");
  };

  // Generate KOT (Kitchen Order Ticket)
  const generateKOT = (orderData) => {
    const kotNumber =
      "KOT-" +
      Date.now().toString().slice(-8) +
      "-" +
      Math.floor(Math.random() * 100);
    const dateTime = formatDateTime();

    return {
      type: "KOT",
      number: kotNumber,
      date: dateTime,
      table: selectedTable?.table_number || "Takeaway",
      server: user?.full_name || user?.username || "Staff",
      items: cart.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        note: item.note,
      })),
      notes: orderNote,
      preparedBy: user?.full_name || user?.username,
    };
  };

  // Generate Bill
  const generateBill = () => {
    const billNumber =
      "BILL-" +
      Date.now().toString().slice(-8) +
      "-" +
      Math.floor(Math.random() * 100);
    const dateTime = formatDateTime();

    return {
      type: "BILL",
      number: billNumber,
      date: dateTime,
      table: selectedTable?.table_number || "Takeaway",
      server: user?.full_name || user?.username || "Staff",
      items: cart.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
        note: item.note,
      })),
      subtotal: calculateSubtotal(),
      tax: calculateTax(),
      taxRate: applyTax ? "10%" : "0%",
      discount: calculateDiscount(),
      discountReason: discount.reason,
      total: calculateTotal(),
      paymentMethod: paymentMethod,
      notes: orderNote,
      cashier: user?.full_name || user?.username,
    };
  };

  // Print KOT
  const printKOT = (kotData) => {
    const printWindow = window.open("", "_blank", "width=400,height=600");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kitchen Order Ticket</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            width: 300px;
            margin: 0 auto;
            padding: 10px;
          }
          .header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
          }
          .header h1 {
            font-size: 18px;
            margin: 0;
            text-transform: uppercase;
          }
          .header h2 {
            font-size: 24px;
            margin: 5px 0;
            color: #d32f2f;
          }
          .info {
            margin-bottom: 15px;
            font-size: 11px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          th {
            text-align: left;
            border-bottom: 1px solid #000;
            padding-bottom: 5px;
          }
          td {
            padding: 3px 0;
          }
          .item-name {
            font-weight: bold;
          }
          .item-note {
            font-size: 10px;
            color: #666;
            padding-left: 10px;
          }
          .footer {
            margin-top: 15px;
            border-top: 1px dashed #000;
            padding-top: 10px;
            text-align: center;
            font-size: 10px;
          }
          .total {
            font-weight: bold;
            font-size: 14px;
            margin-top: 10px;
            text-align: right;
          }
          @media print {
            body { margin: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>RMS PRO</h1>
          <h2>KITCHEN ORDER TICKET</h2>
          <div>${kotData.number}</div>
        </div>
        
        <div class="info">
          <div class="info-row">
            <span>Date:</span>
            <span>${kotData.date}</span>
          </div>
          <div class="info-row">
            <span>Table:</span>
            <span>${kotData.table}</span>
          </div>
          <div class="info-row">
            <span>Server:</span>
            <span>${kotData.server}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th align="right">Qty</th>
            </tr>
          </thead>
          <tbody>
            ${kotData.items
              .map(
                (item) => `
              <tr>
                <td>
                  <div class="item-name">${item.quantity}x ${item.name}</div>
                  ${item.note ? `<div class="item-note">Note: ${item.note}</div>` : ""}
                </td>
                <td align="right">${item.quantity}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        ${
          kotData.notes
            ? `
          <div class="info-row">
            <strong>Order Notes:</strong> ${kotData.notes}
          </div>
        `
            : ""
        }

        <div class="footer">
          <div>Prepared by: ${kotData.preparedBy}</div>
          <div>${kotData.date}</div>
          <div style="margin-top: 5px;">*** KITCHEN COPY ***</div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Print Bill
  const printBill = (billData) => {
    const printWindow = window.open("", "_blank", "width=400,height=600");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bill Receipt</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            width: 300px;
            margin: 0 auto;
            padding: 10px;
          }
          .header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          .header h1 {
            font-size: 18px;
            margin: 0;
            text-transform: uppercase;
          }
          .header h2 {
            font-size: 20px;
            margin: 5px 0;
            color: #000;
          }
          .info {
            margin-bottom: 15px;
            font-size: 11px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          th {
            text-align: left;
            border-bottom: 1px solid #000;
            padding-bottom: 5px;
          }
          td {
            padding: 3px 0;
          }
          .item-name {
            font-weight: bold;
          }
          .item-note {
            font-size: 10px;
            color: #666;
            padding-left: 10px;
          }
          .total-line {
            display: flex;
            justify-content: space-between;
            margin-top: 5px;
            font-weight: bold;
          }
          .grand-total {
            font-size: 16px;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 2px solid #000;
          }
          .footer {
            margin-top: 15px;
            border-top: 1px dashed #000;
            padding-top: 10px;
            text-align: center;
            font-size: 10px;
          }
          .thank-you {
            text-align: center;
            margin-top: 15px;
            font-style: italic;
          }
          @media print {
            body { margin: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>RMS PRO</h1>
          <h2>RESTAURANT BILL</h2>
          <div>${billData.number}</div>
        </div>
        
        <div class="info">
          <div class="info-row">
            <span>Date:</span>
            <span>${billData.date}</span>
          </div>
          <div class="info-row">
            <span>Table:</span>
            <span>${billData.table}</span>
          </div>
          <div class="info-row">
            <span>Server:</span>
            <span>${billData.server}</span>
          </div>
          <div class="info-row">
            <span>Cashier:</span>
            <span>${billData.cashier}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th align="right">Qty</th>
              <th align="right">Price</th>
              <th align="right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${billData.items
              .map(
                (item) => `
              <tr>
                <td>
                  <div class="item-name">${item.name}</div>
                  ${item.note ? `<div class="item-note">Note: ${item.note}</div>` : ""}
                </td>
                <td align="right">${item.quantity}</td>
                <td align="right">${formatCurrency(item.price)}</td>
                <td align="right">${formatCurrency(item.total)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <div class="total-line">
          <span>Subtotal:</span>
          <span>${formatCurrency(billData.subtotal)}</span>
        </div>
        
        ${
          billData.tax > 0
            ? `
          <div class="total-line">
            <span>Tax (${billData.taxRate}):</span>
            <span>${formatCurrency(billData.tax)}</span>
          </div>
        `
            : ""
        }
        
        ${
          billData.discount > 0
            ? `
          <div class="total-line" style="color: #d32f2f;">
            <span>Discount ${billData.discountReason ? `(${billData.discountReason})` : ""}:</span>
            <span>-${formatCurrency(billData.discount)}</span>
          </div>
        `
            : ""
        }
        
        <div class="total-line grand-total">
          <span>TOTAL:</span>
          <span>${formatCurrency(billData.total)}</span>
        </div>

        <div class="info-row" style="margin-top: 10px;">
          <span>Payment Method:</span>
          <span>${billData.paymentMethod.toUpperCase()}</span>
        </div>

        ${
          billData.notes
            ? `
          <div class="info-row" style="margin-top: 10px;">
            <span>Notes:</span>
            <span>${billData.notes}</span>
          </div>
        `
            : ""
        }

        <div class="thank-you">
          Thank you for dining with us!
        </div>

        <div class="footer">
          <div>${billData.date}</div>
          <div style="margin-top: 5px;">*** CUSTOMER COPY ***</div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    if (!selectedTable) {
      toast.error("No table selected");
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        table_id: selectedTable.id,
        order_type: "dine-in",
        items: cart.map((item) => ({
          menu_item_id: item.id,
          quantity: safeNumber(item.quantity),
          notes: item.note || "",
        })),
        notes: orderNote,
        server_id: user?.id,
        subtotal: calculateSubtotal(),
        tax: calculateTax(),
        discount: calculateDiscount(),
        discount_type: discount.type,
        discount_value: discount.value,
        discount_reason: discount.reason,
        total: calculateTotal(),
      };

      console.log("Placing order:", orderData);

      const response = await orderAPI.createOrder(orderData);
      console.log("Order response:", response.data);

      if (response.data.data && response.data.data.id) {
        await tableAPI.updateTableStatus(selectedTable.id, "occupied");
      }

      // Generate and print KOT
      const kotData = generateKOT(orderData);
      printKOT(kotData);

      setLastOrder(response.data.data);
      toast.success("Order placed successfully! KOT printed.");
    } catch (error) {
      console.error("Failed to place order:", error);
      console.error("Error response:", error.response?.data);
      toast.error(error.response?.data?.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintBill = () => {
    if (cart.length === 0) {
      toast.error("No items to print bill");
      return;
    }

    const billData = generateBill();
    printBill(billData);
    toast.success("Bill printed successfully");
  };

  const handleProcessPayment = async () => {
    if (cart.length === 0) {
      toast.error("No items to process");
      return;
    }

    if (!selectedTable) {
      toast.error("No table selected");
      return;
    }

    const total = calculateTotal();

    if (paymentMethod === "cash") {
      const received = safeNumber(paymentAmount);
      if (!received || received < total) {
        toast.error("Insufficient payment amount");
        return;
      }
    }

    setLoading(true);
    try {
      console.log(
        "Processing payment for table:",
        selectedTable.id,
        "amount:",
        total,
      );

      // Print bill before payment (for customer to review)
      const billData = generateBill();
      printBill(billData);

      if (selectedTable.current_order_id) {
        try {
          await orderAPI.updateOrderStatus(
            selectedTable.current_order_id,
            "paid",
          );
        } catch (orderError) {
          console.error("Failed to update order status:", orderError);
        }
      }

      const statusResponse = await tableAPI.updateTableStatus(
        selectedTable.id,
        "available",
      );
      console.log("Table status update response:", statusResponse.data);

      toast.success(
        paymentMethod === "credit"
          ? "Payment recorded as credit"
          : "Payment processed successfully!",
      );
      setShowPaymentModal(false);
      setShowOrderModal(false);
      setCart([]);
      setPaymentAmount("");
      setPaymentNote("");
      setDiscount({ type: "percentage", value: 0, reason: "" });
      setApplyTax(true);
      await loadData();
    } catch (error) {
      console.error("Failed to process payment:", error);
      console.error("Error response:", error.response?.data);
      toast.error(error.response?.data?.message || "Failed to process payment");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTable = async (e) => {
    e.preventDefault();
    try {
      await tableAPI.createTable(newTable);
      toast.success("Table added successfully");
      setShowAddTableModal(false);
      setNewTable({
        table_number: "",
        capacity: 4,
        min_capacity: 1,
        shape: "round",
        section: "Main",
        location: "",
      });
      await loadData();
    } catch (error) {
      console.error("Add table error:", error);
      toast.error(error.response?.data?.message || "Failed to add table");
    }
  };

  const handleDeleteTable = async (id) => {
    if (window.confirm("Are you sure you want to delete this table?")) {
      try {
        await tableAPI.deleteTable(id);
        toast.success("Table deleted");
        await loadData();
      } catch (error) {
        console.error("Delete table error:", error);
        toast.error(error.response?.data?.message || "Failed to delete table");
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "available":
        return "bg-green-500";
      case "occupied":
        return "bg-red-500";
      case "reserved":
        return "bg-blue-500";
      case "cleaning":
        return "bg-yellow-500";
      case "maintenance":
        return "bg-gray-500";
      default:
        return "bg-gray-300";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "available":
        return "Available";
      case "occupied":
        return "Occupied";
      case "reserved":
        return "Reserved";
      case "cleaning":
        return "Cleaning";
      case "maintenance":
        return "Maintenance";
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Table Management POS
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {tables.filter((t) => t.status === "available").length} tables
            available • {tables.filter((t) => t.status === "occupied").length}{" "}
            occupied
          </p>
        </div>
        <div className="flex space-x-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Tables</option>
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="reserved">Reserved</option>
            <option value="cleaning">Cleaning</option>
          </select>

          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Sections</option>
            {sections.length > 0
              ? sections.map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))
              : ["Main", "Window", "Bar", "Outdoor", "Private"].map(
                  (section) => (
                    <option key={section} value={section}>
                      {section}
                    </option>
                  ),
                )}
          </select>

          <button
            onClick={() => setShowAddTableModal(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Table
          </button>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {filteredTables.map((table) => (
          <div
            key={table.id}
            onClick={() => handleTableClick(table)}
            className="bg-white rounded-xl shadow-sm border-2 hover:shadow-lg transition-all cursor-pointer relative group"
            style={{
              borderColor:
                table.status === "available"
                  ? "#10b981"
                  : table.status === "occupied"
                    ? "#ef4444"
                    : table.status === "reserved"
                      ? "#3b82f6"
                      : table.status === "cleaning"
                        ? "#f59e0b"
                        : "#6b7280",
            }}
          >
            {/* Delete button for admin */}
            {user?.role_id === 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTable(table.id);
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}

            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold">
                  Table {table.table_number}
                </span>
                <div
                  className={`w-3 h-3 rounded-full ${getStatusColor(table.status)}`}
                  title={getStatusText(table.status)}
                ></div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-600">
                  <UserGroupIcon className="h-4 w-4 mr-1" />
                  <span>
                    Capacity: {table.min_capacity || 1}-{table.capacity}
                  </span>
                </div>

                {table.section && (
                  <div className="flex items-center text-gray-600">
                    <MapPinIcon className="h-4 w-4 mr-1" />
                    <span>{table.section}</span>
                  </div>
                )}

                {table.status === "occupied" && table.order_total && (
                  <div className="mt-2 pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Bill:</span>
                      <span className="font-bold text-primary-600">
                        {formatCurrency(table.order_total)}
                      </span>
                    </div>
                    {table.item_count > 0 && (
                      <span className="text-xs text-gray-500">
                        {table.item_count} items
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Order Modal */}
      {showOrderModal && selectedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-bold">
                    Table {selectedTable.table_number}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedTable.section} Section • Capacity{" "}
                    {selectedTable.capacity}
                  </p>
                </div>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-2 gap-6">
                {/* Menu Column */}
                <div>
                  <h3 className="font-semibold mb-3">Menu Items</h3>

                  {/* Search */}
                  <div className="relative mb-3">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search items..."
                      className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Categories */}
                  <div className="flex overflow-x-auto mb-3 pb-2 space-x-1">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
                          selectedCategory === cat
                            ? "bg-primary-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {cat === "all" ? "All" : cat}
                      </button>
                    ))}
                  </div>

                  {/* Menu Grid */}
                  <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                    {filteredItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => addToCart(item)}
                        className="bg-gray-50 rounded-lg p-3 text-left hover:shadow-md border border-gray-200"
                      >
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatCurrency(item.price)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cart Column */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center justify-between">
                    <span>Current Order</span>
                    <span className="bg-primary-100 text-primary-600 px-2 py-1 rounded-full text-xs">
                      {cart.length} items
                    </span>
                  </h3>

                  {/* Cart Items */}
                  <div className="space-y-2 max-h-80 overflow-y-auto mb-3">
                    {cart.map((item) => (
                      <div key={item.id} className="bg-gray-50 rounded-lg p-2">
                        <div className="flex justify-between items-start">
                          <span className="font-medium text-sm">
                            {item.name}
                          </span>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center border rounded">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="px-2 py-1 hover:bg-gray-200"
                            >
                              <MinusIcon className="h-3 w-3" />
                            </button>
                            <span className="px-3 py-1 text-sm">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="px-2 py-1 hover:bg-gray-200"
                            >
                              <PlusIcon className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="font-bold text-primary-600">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                        </div>

                        <input
                          type="text"
                          placeholder="Special instructions..."
                          value={item.note || ""}
                          onChange={(e) =>
                            updateItemNote(item.id, e.target.value)
                          }
                          className="mt-2 w-full text-xs border rounded px-2 py-1"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Tax Toggle */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">
                      Apply Tax (10%)
                    </span>
                    <button
                      onClick={() => setApplyTax(!applyTax)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        applyTax ? "bg-primary-600" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          applyTax ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Order Summary */}
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span>{formatCurrency(calculateSubtotal())}</span>
                    </div>

                    {applyTax && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax (10%)</span>
                        <span>{formatCurrency(calculateTax())}</span>
                      </div>
                    )}

                    {discount.value > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>
                          Discount (
                          {discount.type === "percentage"
                            ? `${discount.value}%`
                            : "Fixed"}
                          )
                        </span>
                        <span>-{formatCurrency(calculateDiscount())}</span>
                      </div>
                    )}

                    <div className="flex justify-between font-bold pt-2 border-t">
                      <span>Total</span>
                      <span className="text-primary-600">
                        {formatCurrency(calculateTotal())}
                      </span>
                    </div>
                  </div>

                  {/* Order Notes */}
                  <textarea
                    placeholder="Order notes..."
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    className="w-full text-xs border rounded-lg p-2 mt-3"
                    rows="2"
                  />

                  {/* Action Buttons */}
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    <button
                      onClick={() => setShowDiscountModal(true)}
                      className="bg-purple-600 text-white py-2 rounded-lg text-sm hover:bg-purple-700 flex items-center justify-center"
                      title="Apply Discount"
                    >
                      <TagIcon className="h-4 w-4 mr-1" />
                      Disc
                    </button>
                    <button
                      onClick={handlePrintBill}
                      disabled={cart.length === 0}
                      className="bg-blue-500 text-white py-2 rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center"
                      title="Print Bill"
                    >
                      <DocumentTextIcon className="h-4 w-4 mr-1" />
                      Bill
                    </button>
                    <button
                      onClick={handlePlaceOrder}
                      disabled={loading || cart.length === 0}
                      className="bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? "..." : "Order"}
                    </button>
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      disabled={loading || cart.length === 0}
                      className="bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                    >
                      <CreditCardIcon className="h-4 w-4 mr-1" />
                      Pay
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Apply Discount</h2>
              <button
                onClick={() => setShowDiscountModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount Type
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() =>
                      setDiscount({ ...discount, type: "percentage", value: 0 })
                    }
                    className={`flex-1 py-2 rounded-lg text-sm ${
                      discount.type === "percentage"
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Percentage (%)
                  </button>
                  <button
                    onClick={() =>
                      setDiscount({ ...discount, type: "amount", value: 0 })
                    }
                    className={`flex-1 py-2 rounded-lg text-sm ${
                      discount.type === "amount"
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Fixed Amount (₹)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {discount.type === "percentage"
                    ? "Discount Percentage"
                    : "Discount Amount"}
                </label>
                <input
                  type="number"
                  step={discount.type === "percentage" ? "1" : "0.01"}
                  min="0"
                  max={
                    discount.type === "percentage" ? 100 : calculateSubtotal()
                  }
                  value={discount.value}
                  onChange={(e) =>
                    setDiscount({
                      ...discount,
                      value: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full border rounded-lg p-2"
                  placeholder={
                    discount.type === "percentage"
                      ? "Enter percentage"
                      : "Enter amount"
                  }
                />
                {discount.type === "percentage" && discount.value > 100 && (
                  <p className="text-xs text-red-600 mt-1">
                    Percentage cannot exceed 100%
                  </p>
                )}
                {discount.type === "amount" &&
                  discount.value > calculateSubtotal() && (
                    <p className="text-xs text-red-600 mt-1">
                      Amount cannot exceed subtotal
                    </p>
                  )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  value={discount.reason}
                  onChange={(e) =>
                    setDiscount({ ...discount, reason: e.target.value })
                  }
                  className="w-full border rounded-lg p-2"
                  placeholder="e.g., Happy hour, Staff meal, Promotion"
                />
              </div>

              {discount.value > 0 && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Discount Amount:</p>
                  <p className="text-lg font-bold text-green-600">
                    -{formatCurrency(calculateDiscount())}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  setDiscount({ type: "percentage", value: 0, reason: "" });
                  setShowDiscountModal(false);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                onClick={handleApplyDiscount}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Apply Discount
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Process Payment</h3>

            <p className="text-3xl font-bold text-center text-primary-600 mb-4">
              {formatCurrency(calculateTotal())}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["cash", "card", "credit"].map((method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 rounded-lg text-sm capitalize ${
                        paymentMethod === method
                          ? "bg-primary-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === "cash" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount Received
                  </label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full border rounded-lg p-2"
                    placeholder="Enter amount"
                    min={calculateTotal()}
                    step="0.01"
                  />
                  {paymentAmount &&
                    safeNumber(paymentAmount) >= calculateTotal() && (
                      <p className="mt-2 text-sm text-green-600">
                        Change:{" "}
                        {formatCurrency(
                          safeNumber(paymentAmount) - calculateTotal(),
                        )}
                      </p>
                    )}
                </div>
              )}

              {paymentMethod === "credit" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) =>
                      setPaymentNote(e.target.value.substring(0, 100))
                    }
                    className="w-full border rounded-lg p-2"
                    placeholder="e.g., Will pay later, Company credit"
                    maxLength="100"
                  />
                  <p className="mt-2 text-sm text-amber-600">
                    This payment will be marked as pending/credit
                  </p>
                </div>
              )}

              {/* Order Summary */}
              <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(calculateSubtotal())}</span>
                </div>
                {applyTax && (
                  <div className="flex justify-between">
                    <span>Tax (10%):</span>
                    <span>{formatCurrency(calculateTax())}</span>
                  </div>
                )}
                {discount.value > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(calculateDiscount())}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-1 border-t">
                  <span>Total:</span>
                  <span>{formatCurrency(calculateTotal())}</span>
                </div>
              </div>

              <p className="text-sm text-gray-600 text-center">
                Table {selectedTable.table_number}
              </p>
            </div>

            <div className="flex space-x-2 mt-6">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-2 border rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessPayment}
                disabled={
                  loading ||
                  (paymentMethod === "cash" &&
                    (!paymentAmount ||
                      safeNumber(paymentAmount) < calculateTotal()))
                }
                className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
              >
                {loading
                  ? "Processing..."
                  : paymentMethod === "credit"
                    ? "Record Credit"
                    : "Pay Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Table Modal */}
      {showAddTableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Add New Table</h2>

            <form onSubmit={handleAddTable} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Table Number *
                </label>
                <input
                  type="number"
                  value={newTable.table_number}
                  onChange={(e) =>
                    setNewTable({
                      ...newTable,
                      table_number: parseInt(e.target.value),
                    })
                  }
                  className="w-full border rounded-lg p-2"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Capacity
                  </label>
                  <input
                    type="number"
                    value={newTable.min_capacity}
                    onChange={(e) =>
                      setNewTable({
                        ...newTable,
                        min_capacity: parseInt(e.target.value),
                      })
                    }
                    className="w-full border rounded-lg p-2"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Capacity
                  </label>
                  <input
                    type="number"
                    value={newTable.capacity}
                    onChange={(e) =>
                      setNewTable({
                        ...newTable,
                        capacity: parseInt(e.target.value),
                      })
                    }
                    className="w-full border rounded-lg p-2"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shape
                </label>
                <select
                  value={newTable.shape}
                  onChange={(e) =>
                    setNewTable({ ...newTable, shape: e.target.value })
                  }
                  className="w-full border rounded-lg p-2"
                >
                  <option value="round">Round</option>
                  <option value="square">Square</option>
                  <option value="rectangle">Rectangle</option>
                  <option value="booth">Booth</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section
                </label>
                <select
                  value={newTable.section}
                  onChange={(e) =>
                    setNewTable({ ...newTable, section: e.target.value })
                  }
                  className="w-full border rounded-lg p-2"
                >
                  <option value="Main">Main</option>
                  <option value="Window">Window</option>
                  <option value="Bar">Bar</option>
                  <option value="Outdoor">Outdoor</option>
                  <option value="Private">Private</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location Notes
                </label>
                <input
                  type="text"
                  value={newTable.location}
                  onChange={(e) =>
                    setNewTable({ ...newTable, location: e.target.value })
                  }
                  className="w-full border rounded-lg p-2"
                  placeholder="e.g., Near window, Corner booth"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddTableModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Add Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TablePOS;
