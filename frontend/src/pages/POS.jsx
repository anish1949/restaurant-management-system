import React, { useState, useEffect } from "react";
import { menuAPI, orderAPI, tableAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import {
  ShoppingCartIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  CreditCardIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckCircleIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";

const POS = () => {
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [orderType, setOrderType] = useState("dine-in");
  const [guestCount, setGuestCount] = useState(2);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  // Get unique categories
  const categories = [
    "all",
    ...new Set(menuItems.map((item) => item.category_name).filter(Boolean)),
  ];

  // Filter items
  const filteredItems = menuItems.filter(
    (item) =>
      item.is_available &&
      (selectedCategory === "all" || item.category_name === selectedCategory) &&
      (item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category_name?.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [menuRes, tablesRes] = await Promise.all([
        menuAPI.getItems({ available: true }),
        tableAPI.getTables(),
      ]);
      setMenuItems(menuRes.data.data || []);
      setTables(tablesRes.data.data || []);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load menu");
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
    } else {
      setCart([...cart, { ...item, quantity: 1, note: "" }]);
    }
    toast.success(`${item.name} added`, { duration: 1000 });
  };

  const updateQuantity = (id, delta) => {
    const item = cart.find((i) => i.id === id);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty < 1) {
      setCart(cart.filter((i) => i.id !== id));
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

  const clearCart = () => {
    if (cart.length > 0 && window.confirm("Clear current order?")) {
      setCart([]);
      setSelectedTable(null);
      setOrderNote("");
    }
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.1;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const placeOrder = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    if (orderType === "dine-in" && !selectedTable) {
      toast.error("Please select a table");
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        table_id: orderType === "dine-in" ? selectedTable : null,
        order_type: orderType,
        guest_count: orderType === "dine-in" ? guestCount : null,
        items: cart.map((item) => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          notes: item.note || "",
        })),
        notes: orderNote,
        server_id: user?.id,
      };

      console.log("Sending order data:", orderData); // Debug log

      const response = await orderAPI.createOrder(orderData);
      console.log("Order response:", response.data); // Debug log

      if (orderType === "dine-in" && selectedTable) {
        await tableAPI.updateTableStatus(selectedTable, "occupied");
      }

      setLastOrder({
        number: response.data.data?.order_number || "ORD" + Date.now(),
        items: cart,
        total: calculateTotal(),
      });

      setOrderPlaced(true);
      setCart([]);
      setSelectedTable(null);
      setOrderNote("");
      toast.success("Order placed successfully!");
    } catch (error) {
      console.error("Failed to place order - Full error:", error);
      console.error("Error response:", error.response?.data);
      toast.error(error.response?.data?.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async () => {
    if (!paymentAmount && paymentMethod === "cash") {
      toast.error("Enter amount received");
      return;
    }

    const total = calculateTotal();
    const received = parseFloat(paymentAmount) || total;

    if (paymentMethod === "cash" && received < total) {
      toast.error("Insufficient payment");
      return;
    }

    setLoading(true);
    try {
      toast.success("Payment successful!");
      setShowPayment(false);
      setPaymentAmount("");

      if (orderType === "dine-in" && selectedTable) {
        await tableAPI.updateTableStatus(selectedTable, "available");
      }

      setCart([]);
      setSelectedTable(null);
      setOrderNote("");
    } catch (error) {
      toast.error("Payment failed");
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = () => {
    if (!lastOrder) return;
    window.print();
  };

  if (orderPlaced && lastOrder) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Order Placed!
          </h2>
          <p className="text-gray-500 mb-4">Order #{lastOrder.number}</p>

          <div className="bg-gray-50 rounded-xl p-4 mb-4 text-left">
            {lastOrder.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm py-1">
                <span>
                  {item.quantity}x {item.name}
                </span>
                <span className="font-medium">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
            <div className="border-t mt-2 pt-2 flex justify-between font-bold">
              <span>Total</span>
              <span className="text-primary-600">
                ₹{lastOrder.total.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={printReceipt}
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl hover:bg-gray-200 flex items-center justify-center"
            >
              <PrinterIcon className="h-5 w-5 mr-2" />
              Print
            </button>
            <button
              onClick={() => {
                setOrderPlaced(false);
                setLastOrder(null);
              }}
              className="flex-1 bg-primary-600 text-white py-3 rounded-xl hover:bg-primary-700"
            >
              New Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-bold text-primary-600">RMS Pro POS</h1>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-600">
            {user?.full_name || user?.username}
          </span>
        </div>
        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Clear Order
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Menu */}
        <div className="w-2/3 bg-white flex flex-col border-r">
          {/* Search */}
          <div className="p-3 border-b">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search items..."
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Categories */}
          <div className="border-b overflow-x-auto">
            <div className="flex px-2 py-2 space-x-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                    selectedCategory === cat
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {cat === "all" ? "All" : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Grid */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="bg-gray-50 rounded-lg p-3 text-left hover:shadow-md border border-gray-200 hover:border-primary-300"
                >
                  <div className="font-medium text-sm">{item.name}</div>
                  {item.category_name && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {item.category_name}
                    </div>
                  )}
                  <div className="mt-2 font-bold text-primary-600">
                    ₹{item.price}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Cart */}
        <div className="w-1/3 bg-gray-50 flex flex-col">
          {/* Order Header */}
          <div className="bg-white p-3 border-b">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center">
                <ShoppingCartIcon className="h-4 w-4 mr-1 text-primary-600" />
                Current Order
              </h2>
              <span className="bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full text-xs">
                {cart.length} items
              </span>
            </div>

            {/* Order Type */}
            <div className="grid grid-cols-3 gap-1 mb-3">
              {["dine-in", "takeaway", "delivery"].map((type) => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={`py-1.5 rounded text-xs font-medium ${
                    orderType === type
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {type === "dine-in"
                    ? "Dine In"
                    : type === "takeaway"
                      ? "Takeaway"
                      : "Delivery"}
                </button>
              ))}
            </div>

            {/* Table Selection */}
            {orderType === "dine-in" && (
              <>
                <div className="grid grid-cols-4 gap-1 mb-2">
                  {tables
                    .filter((t) => t.status === "available")
                    .map((table) => (
                      <button
                        key={table.id}
                        onClick={() => setSelectedTable(table.id)}
                        className={`py-1.5 rounded text-xs ${
                          selectedTable === table.id
                            ? "bg-primary-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        T{table.table_number}
                      </button>
                    ))}
                </div>

                {/* Guest Count */}
                <div className="flex items-center space-x-2">
                  <UserGroupIcon className="h-4 w-4 text-gray-400" />
                  <select
                    value={guestCount}
                    onChange={(e) => setGuestCount(parseInt(e.target.value))}
                    className="flex-1 border rounded-lg px-2 py-1.5 text-xs"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>
                        {n} Guest{n > 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCartIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Cart empty</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="bg-white rounded-lg p-2 border">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm">{item.name}</span>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center border rounded">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="px-2 py-0.5 hover:bg-gray-100"
                      >
                        <MinusIcon className="h-3 w-3" />
                      </button>
                      <span className="px-3 py-0.5 text-xs">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="px-2 py-0.5 hover:bg-gray-100"
                      >
                        <PlusIcon className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="font-bold text-primary-600 text-sm">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>

                  <input
                    type="text"
                    placeholder="Special instructions..."
                    value={item.note || ""}
                    onChange={(e) => updateItemNote(item.id, e.target.value)}
                    className="mt-2 w-full text-xs border rounded px-2 py-1"
                  />
                </div>
              ))
            )}
          </div>

          {/* Order Summary */}
          {cart.length > 0 && (
            <div className="bg-white border-t p-3 space-y-3">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>₹{calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax (10%)</span>
                  <span>₹{calculateTax().toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t">
                  <span>Total</span>
                  <span className="text-primary-600">
                    ₹{calculateTotal().toFixed(2)}
                  </span>
                </div>
              </div>

              <textarea
                placeholder="Order notes..."
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                className="w-full text-xs border rounded p-2"
                rows="2"
              />

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={placeOrder}
                  disabled={loading}
                  className="bg-blue-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Placing..." : "Place Order"}
                </button>
                <button
                  onClick={() => setShowPayment(true)}
                  disabled={loading}
                  className="bg-green-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                >
                  <CreditCardIcon className="h-4 w-4 mr-1" />
                  Pay
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4">Process Payment</h3>

            <p className="text-3xl font-bold text-center text-primary-600 mb-4">
              ₹{calculateTotal().toFixed(2)}
            </p>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {["cash", "card", "mobile"].map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 rounded-lg text-sm ${
                      paymentMethod === method
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>

              {paymentMethod === "cash" && (
                <input
                  type="number"
                  placeholder="Amount received"
                  className="w-full border rounded-lg p-2 text-sm"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  autoFocus
                />
              )}

              {paymentMethod === "cash" && paymentAmount && (
                <p className="text-sm text-green-600">
                  Change: ₹
                  {(parseFloat(paymentAmount) - calculateTotal()).toFixed(2)}
                </p>
              )}
            </div>

            <div className="flex space-x-2 mt-4">
              <button
                onClick={() => setShowPayment(false)}
                className="flex-1 py-2 border rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={processPayment}
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
              >
                Pay Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
