import React, { useState, useEffect } from "react";
import { orderAPI, inventoryAPI } from "../services/api";
import { toast } from "react-hot-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  ArrowDownTrayIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";

// Helper function to safely parse numbers
const safeNumber = (value) => {
  if (value === null || value === undefined) return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
};

const Reports = () => {
  const [activeTab, setActiveTab] = useState("sales");
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState("week");
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  // Report data states
  const [salesData, setSalesData] = useState([]);
  const [orderStats, setOrderStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
  });
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [inventoryReport, setInventoryReport] = useState({
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalValue: 0,
    items: [],
  });

  const COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
  ];

  useEffect(() => {
    if (activeTab === "sales") {
      fetchSalesReport();
    } else if (activeTab === "inventory") {
      fetchInventoryReport();
    }
  }, [activeTab, dateRange, startDate, endDate]);

  const fetchSalesReport = async () => {
    setLoading(true);
    try {
      // Fetch orders within date range
      const ordersResponse = await orderAPI.getOrders({
        start_date: startDate,
        end_date: endDate,
      });

      const orders = ordersResponse.data.data || [];

      // Calculate order statistics with safe number handling
      let totalRevenue = 0;
      let pendingCount = 0;
      let completedCount = 0;
      let cancelledCount = 0;

      orders.forEach((order) => {
        const amount = safeNumber(order.total_amount);
        totalRevenue += amount;

        if (["pending", "preparing"].includes(order.status)) {
          pendingCount++;
        } else if (["paid", "served"].includes(order.status)) {
          completedCount++;
        } else if (order.status === "cancelled") {
          cancelledCount++;
        }
      });

      const totalOrders = orders.length;
      const averageOrderValue =
        totalOrders > 0 ? totalRevenue / totalOrders : 0;

      setOrderStats({
        totalOrders,
        totalRevenue,
        averageOrderValue,
        pendingOrders: pendingCount,
        completedOrders: completedCount,
        cancelledOrders: cancelledCount,
      });

      // Calculate payment methods distribution
      const paymentCounts = {};
      orders.forEach((order) => {
        const method = order.payment_method || "cash";
        const amount = safeNumber(order.total_amount);
        paymentCounts[method] = (paymentCounts[method] || 0) + amount;
      });

      const paymentData = Object.entries(paymentCounts).map(
        ([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value: safeNumber(value),
        }),
      );
      setPaymentMethods(paymentData);

      // Group orders by date for chart
      const salesByDate = {};
      orders.forEach((order) => {
        const date = order.created_at?.split("T")[0];
        if (date) {
          if (!salesByDate[date]) {
            salesByDate[date] = { date, sales: 0, orders: 0 };
          }
          salesByDate[date].sales += safeNumber(order.total_amount);
          salesByDate[date].orders += 1;
        }
      });

      const chartData = Object.values(salesByDate).sort((a, b) =>
        a.date.localeCompare(b.date),
      );
      setSalesData(chartData);

      // Fetch top selling items from order items
      const itemSales = {};
      orders.forEach((order) => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item) => {
            const key = item.name || `Item ${item.menu_item_id}`;
            if (!itemSales[key]) {
              itemSales[key] = { name: key, quantity: 0, revenue: 0 };
            }
            itemSales[key].quantity += safeNumber(item.quantity);
            itemSales[key].revenue += safeNumber(item.subtotal);
          });
        }
      });

      const topItemsData = Object.values(itemSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)
        .map((item) => ({
          ...item,
          quantity: safeNumber(item.quantity),
          revenue: safeNumber(item.revenue),
        }));
      setTopItems(topItemsData);
    } catch (error) {
      console.error("Failed to fetch sales report:", error);
      toast.error("Failed to fetch sales report");
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryReport = async () => {
    setLoading(true);
    try {
      const response = await inventoryAPI.getInventory();
      const items = response.data.data || [];

      let totalValue = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;

      items.forEach((item) => {
        const quantity = safeNumber(item.quantity);
        const unitCost = safeNumber(item.unit_cost);
        const reorderLevel = safeNumber(item.reorder_level);

        totalValue += quantity * unitCost;

        if (quantity <= reorderLevel) {
          lowStockCount++;
        }
        if (quantity <= 0) {
          outOfStockCount++;
        }
      });

      const processedItems = items.slice(0, 10).map((item) => ({
        ...item,
        quantity: safeNumber(item.quantity),
        unit_cost: safeNumber(item.unit_cost),
        reorder_level: safeNumber(item.reorder_level),
      }));

      setInventoryReport({
        totalItems: items.length,
        lowStockItems: lowStockCount,
        outOfStockItems: outOfStockCount,
        totalValue,
        items: processedItems,
      });
    } catch (error) {
      console.error("Failed to fetch inventory report:", error);
      toast.error("Failed to fetch inventory report");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    try {
      let csvContent = "";
      let filename = "";

      if (activeTab === "sales") {
        // Sales report CSV
        const headers = ["Date", "Orders", "Revenue"];
        const rows = salesData.map((d) => [
          d.date,
          d.orders,
          safeNumber(d.sales).toFixed(2),
        ]);
        csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
        filename = `sales_report_${startDate}_to_${endDate}.csv`;
      } else if (activeTab === "inventory") {
        // Inventory report CSV
        const headers = [
          "Item Name",
          "Quantity",
          "Unit",
          "Unit Cost",
          "Total Value",
          "Status",
        ];
        const rows = inventoryReport.items.map((item) => [
          item.item_name,
          safeNumber(item.quantity),
          item.unit,
          safeNumber(item.unit_cost).toFixed(2),
          (safeNumber(item.quantity) * safeNumber(item.unit_cost)).toFixed(2),
          safeNumber(item.quantity) <= safeNumber(item.reorder_level)
            ? "Low Stock"
            : "Good",
        ]);
        csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
        filename = `inventory_report_${new Date().toISOString().split("T")[0]}.csv`;
      }

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success("Report exported successfully");
    } catch (error) {
      console.error("Failed to export report:", error);
      toast.error("Failed to export report");
    }
  };

  const formatCurrency = (value) => {
    const num = safeNumber(value);
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Reports & Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time data from your restaurant
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center"
        >
          <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
          Export CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("sales")}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === "sales"
                ? "border-b-2 border-primary-600 text-primary-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <CurrencyDollarIcon className="h-4 w-4 inline mr-2" />
            Sales Report
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === "inventory"
                ? "border-b-2 border-primary-600 text-primary-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <CubeIcon className="h-4 w-4 inline mr-2" />
            Inventory Report
          </button>
        </div>

        {/* Date Range Selector */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">Date Range:</span>
            </div>
            <select
              value={dateRange}
              onChange={(e) => {
                const range = e.target.value;
                setDateRange(range);

                const today = new Date();
                let start = new Date();

                if (range === "today") {
                  start = today;
                } else if (range === "week") {
                  start.setDate(today.getDate() - 7);
                } else if (range === "month") {
                  start.setMonth(today.getMonth() - 1);
                } else if (range === "quarter") {
                  start.setMonth(today.getMonth() - 3);
                } else if (range === "year") {
                  start.setFullYear(today.getFullYear() - 1);
                }

                setStartDate(start.toISOString().split("T")[0]);
                setEndDate(today.toISOString().split("T")[0]);
              }}
              className="border rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>

            {dateRange === "custom" && (
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border rounded-lg px-3 py-1.5 text-sm"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border rounded-lg px-3 py-1.5 text-sm"
                />
              </div>
            )}
          </div>
        </div>

        {/* Report Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <>
              {/* Sales Report */}
              {activeTab === "sales" && (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                      <p className="text-sm opacity-90">Total Orders</p>
                      <p className="text-2xl font-bold mt-1">
                        {orderStats.totalOrders}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
                      <p className="text-sm opacity-90">Total Revenue</p>
                      <p className="text-2xl font-bold mt-1">
                        {formatCurrency(orderStats.totalRevenue)}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
                      <p className="text-sm opacity-90">Average Order</p>
                      <p className="text-2xl font-bold mt-1">
                        {formatCurrency(orderStats.averageOrderValue)}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-4 text-white">
                      <p className="text-sm opacity-90">Completed Orders</p>
                      <p className="text-2xl font-bold mt-1">
                        {orderStats.completedOrders}
                      </p>
                    </div>
                  </div>

                  {/* Sales Chart */}
                  <div className="bg-white rounded-lg border p-4">
                    <h3 className="font-semibold text-gray-800 mb-4">
                      Sales Trend
                    </h3>
                    <div style={{ width: "100%", height: "400px" }}>
                      <ResponsiveContainer>
                        <LineChart data={salesData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip
                            formatter={(value) => formatCurrency(value)}
                          />
                          <Legend />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="sales"
                            stroke="#3b82f6"
                            name="Revenue"
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="orders"
                            stroke="#10b981"
                            name="Orders"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Payment Methods & Top Items */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Payment Methods */}
                    <div className="bg-white rounded-lg border p-4">
                      <h3 className="font-semibold text-gray-800 mb-4">
                        Payment Methods
                      </h3>
                      {paymentMethods.length > 0 ? (
                        <div style={{ width: "100%", height: "300px" }}>
                          <ResponsiveContainer>
                            <PieChart>
                              <Pie
                                data={paymentMethods}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                label={(entry) => entry.name}
                              >
                                {paymentMethods.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                  />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value) => formatCurrency(value)}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-center text-gray-500 py-8">
                          No payment data available
                        </p>
                      )}
                    </div>

                    {/* Top Selling Items */}
                    <div className="bg-white rounded-lg border p-4">
                      <h3 className="font-semibold text-gray-800 mb-4">
                        Top Selling Items
                      </h3>
                      {topItems.length > 0 ? (
                        <div className="space-y-3">
                          {topItems.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between"
                            >
                              <div className="flex items-center">
                                <span className="w-6 text-sm font-medium text-gray-500">
                                  {index + 1}.
                                </span>
                                <span className="text-sm text-gray-700">
                                  {item.name}
                                </span>
                              </div>
                              <div className="flex items-center space-x-4">
                                <span className="text-xs text-gray-500">
                                  {item.quantity} sold
                                </span>
                                <span className="text-sm font-medium text-primary-600">
                                  {formatCurrency(item.revenue)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-gray-500 py-8">
                          No sales data available
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Inventory Report */}
              {activeTab === "inventory" && (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                      <p className="text-sm opacity-90">Total Items</p>
                      <p className="text-2xl font-bold mt-1">
                        {inventoryReport.totalItems}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-4 text-white">
                      <p className="text-sm opacity-90">Low Stock</p>
                      <p className="text-2xl font-bold mt-1">
                        {inventoryReport.lowStockItems}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 text-white">
                      <p className="text-sm opacity-90">Out of Stock</p>
                      <p className="text-2xl font-bold mt-1">
                        {inventoryReport.outOfStockItems}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
                      <p className="text-sm opacity-90">Total Value</p>
                      <p className="text-2xl font-bold mt-1">
                        {formatCurrency(inventoryReport.totalValue)}
                      </p>
                    </div>
                  </div>

                  {/* Inventory Table */}
                  <div className="bg-white rounded-lg border overflow-hidden">
                    <h3 className="font-semibold text-gray-800 p-4 border-b">
                      Inventory Items
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                              Item Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                              Quantity
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                              Unit
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                              Unit Cost
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                              Total Value
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {inventoryReport.items.map((item) => {
                            const quantity = safeNumber(item.quantity);
                            const unitCost = safeNumber(item.unit_cost);
                            const reorderLevel = safeNumber(item.reorder_level);
                            const totalValue = quantity * unitCost;

                            return (
                              <tr key={item.id}>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                  {item.item_name}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {quantity}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {item.unit}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {formatCurrency(unitCost)}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-primary-600">
                                  {formatCurrency(totalValue)}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      quantity <= reorderLevel
                                        ? "bg-red-100 text-red-700"
                                        : "bg-green-100 text-green-700"
                                    }`}
                                  >
                                    {quantity <= reorderLevel
                                      ? "Low Stock"
                                      : "Good"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
