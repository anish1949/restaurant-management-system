import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { orderAPI, menuAPI, tableAPI, staffAPI } from "../services/api";
import { toast } from "react-hot-toast";
import {
  CurrencyDollarIcon,
  ShoppingBagIcon,
  UsersIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CreditCardIcon,
  BanknotesIcon,
  UserGroupIcon,
  CubeIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

// Helper function to safely parse numbers
const safeNumber = (value) => {
  if (value === null || value === undefined) return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
};

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("week");

  // Real data states
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    avgOrderValue: 0,
    todayRevenue: 0,
    todayOrders: 0,
    activeTables: 0,
    staffOnDuty: 0,
    lowStockItems: 0,
    pendingOrders: 0,
  });

  const [revenueData, setRevenueData] = useState([]);
  const [orderStatusData, setOrderStatusData] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [topSellingItems, setTopSellingItems] = useState([]);
  const [staffPerformance, setStaffPerformance] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Get date range based on selection
      const endDate = new Date().toISOString().split("T")[0];
      let startDate = new Date();

      if (timeRange === "day") {
        startDate = new Date().toISOString().split("T")[0];
      } else if (timeRange === "week") {
        startDate.setDate(startDate.getDate() - 7);
        startDate = startDate.toISOString().split("T")[0];
      } else if (timeRange === "month") {
        startDate.setMonth(startDate.getMonth() - 1);
        startDate = startDate.toISOString().split("T")[0];
      }

      // Fetch all orders
      const ordersResponse = await orderAPI.getOrders({
        start_date: startDate,
        end_date: endDate,
        limit: 1000,
      });
      const orders = ordersResponse.data.data || [];

      // Fetch today's orders
      const today = new Date().toISOString().split("T")[0];
      const todayOrdersResponse = await orderAPI.getOrders({
        date: today,
        limit: 1000,
      });
      const todayOrders = todayOrdersResponse.data.data || [];

      // Fetch menu items for total count and low stock
      const menuResponse = await menuAPI.getItems();
      const menuItems = menuResponse.data.data || [];

      // Fetch tables
      const tablesResponse = await tableAPI.getTables();
      const tables = tablesResponse.data.data || [];

      // Fetch staff
      const staffResponse = await staffAPI.getStaff();
      const staff = staffResponse.data.data || [];

      // Calculate real stats with safe numbers
      let totalRevenue = 0;
      let pendingCount = 0;

      orders.forEach((order) => {
        totalRevenue += safeNumber(order.total_amount);
        if (["pending", "preparing"].includes(order.status)) {
          pendingCount++;
        }
      });

      const totalOrders = orders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      let todayRevenue = 0;
      todayOrders.forEach((order) => {
        todayRevenue += safeNumber(order.total_amount);
      });
      const todayOrdersCount = todayOrders.length;

      const activeTables = tables.filter((t) => t.status === "occupied").length;
      const staffOnDuty = staff.filter((s) => s.is_active).length;

      const lowStockItems = menuItems.filter((item) => {
        const quantity = safeNumber(item.quantity);
        const reorderLevel = safeNumber(item.reorder_level);
        return item.track_inventory && quantity <= reorderLevel;
      }).length;

      // Get unique customers count
      const uniqueCustomers = new Set(
        orders.map((o) => o.customer_id).filter((id) => id),
      ).size;

      setStats({
        totalRevenue,
        totalOrders,
        totalCustomers: uniqueCustomers || 0,
        avgOrderValue,
        todayRevenue,
        todayOrders: todayOrdersCount,
        activeTables,
        staffOnDuty: staffOnDuty || 0,
        lowStockItems,
        pendingOrders: pendingCount,
      });

      // Calculate revenue over time for chart
      const revenueByDate = {};
      orders.forEach((order) => {
        const date = order.created_at?.split("T")[0];
        if (date) {
          if (!revenueByDate[date]) {
            revenueByDate[date] = { date, revenue: 0 };
          }
          revenueByDate[date].revenue += safeNumber(order.total_amount);
        }
      });

      const revenueChartData = Object.values(revenueByDate).sort((a, b) =>
        a.date.localeCompare(b.date),
      );
      setRevenueData(revenueChartData);

      // Calculate order status distribution
      const statusCounts = {};
      orders.forEach((order) => {
        const status = order.status || "unknown";
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      const statusData = Object.entries(statusCounts).map(([name, value]) => ({
        name,
        value,
      }));
      setOrderStatusData(statusData);

      // Calculate top selling items
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

      const topItems = Object.values(itemSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)
        .map((item) => ({
          ...item,
          quantity: safeNumber(item.quantity),
          revenue: safeNumber(item.revenue),
        }));
      setTopSellingItems(topItems);

      // Calculate payment methods distribution
      const paymentCounts = {};
      orders.forEach((order) => {
        const method = order.payment_method || "cash";
        paymentCounts[method] =
          (paymentCounts[method] || 0) + safeNumber(order.total_amount);
      });

      const paymentData = Object.entries(paymentCounts).map(
        ([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value: safeNumber(value),
        }),
      );
      setPaymentMethods(paymentData);

      // Get recent orders
      const recent = orders
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);
      setRecentOrders(recent);

      // Staff performance (from actual orders if available)
      const staffPerf = staff
        .slice(0, 5)
        .map((s) => {
          const staffOrders = orders.filter((o) => o.waiter_id === s.id);
          const ordersTaken = staffOrders.length;
          const totalSales = staffOrders.reduce(
            (sum, o) => sum + safeNumber(o.total_amount),
            0,
          );

          return {
            id: s.id,
            full_name: s.full_name,
            orders_taken: ordersTaken,
            total_sales: totalSales,
          };
        })
        .filter((s) => s.orders_taken > 0 || s.total_sales > 0);

      setStaffPerformance(
        staffPerf.length > 0
          ? staffPerf
          : staff.slice(0, 5).map((s) => ({
              id: s.id,
              full_name: s.full_name,
              orders_taken: 0,
              total_sales: 0,
            })),
      );
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
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

  const formatNumber = (value) => {
    return new Intl.NumberFormat("en-IN").format(safeNumber(value));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back, {user?.full_name || "Admin"}! Real-time data from your
            restaurant.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Time Range:</span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* KPI Cards - All Real Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">
                {formatCurrency(stats.totalRevenue)}
              </h3>
            </div>
            <div className="bg-green-100 p-2 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500">
            From {stats.totalOrders} orders
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm text-gray-500">Total Orders</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">
                {formatNumber(stats.totalOrders)}
              </h3>
            </div>
            <div className="bg-blue-100 p-2 rounded-lg">
              <ShoppingBagIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Avg: {formatCurrency(stats.avgOrderValue)} per order
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm text-gray-500">Today's Revenue</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">
                {formatCurrency(stats.todayRevenue)}
              </h3>
            </div>
            <div className="bg-purple-100 p-2 rounded-lg">
              <BanknotesIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500">
            {stats.todayOrders} orders today
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm text-gray-500">Active Tables</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">
                {stats.activeTables}
              </h3>
            </div>
            <div className="bg-orange-100 p-2 rounded-lg">
              <UserGroupIcon className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500">
            {stats.pendingOrders} pending orders
          </p>
        </div>
      </div>

      {/* Second Row of Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center">
            <div className="bg-red-100 p-2 rounded-lg mr-3">
              <CubeIcon className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Low Stock Items</p>
              <p className="text-lg font-bold text-gray-800">
                {stats.lowStockItems}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-2 rounded-lg mr-3">
              <ClockIcon className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Staff on Duty</p>
              <p className="text-lg font-bold text-gray-800">
                {stats.staffOnDuty}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center">
            <div className="bg-indigo-100 p-2 rounded-lg mr-3">
              <UsersIcon className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Customers</p>
              <p className="text-lg font-bold text-gray-800">
                {formatNumber(stats.totalCustomers)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center">
            <div className="bg-teal-100 p-2 rounded-lg mr-3">
              <ChartBarIcon className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Avg Order Value</p>
              <p className="text-lg font-bold text-gray-800">
                {formatCurrency(stats.avgOrderValue)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">Revenue Trend</h3>
          {revenueData.length > 0 ? (
            <div style={{ width: "100%", height: "300px" }}>
              <ResponsiveContainer>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient
                      id="colorRevenue"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop
                        offset="95%"
                        stopColor="#3b82f6"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${safeNumber(value) / 1000}k`}
                  />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No revenue data available for this period
            </div>
          )}
        </div>

        {/* Order Status Chart */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">Order Status</h3>
          {orderStatusData.length > 0 ? (
            <div style={{ width: "100%", height: "300px" }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={(entry) => entry.name}
                  >
                    {orderStatusData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No order data available
            </div>
          )}
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Payment Methods */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">Payment Methods</h3>
          {paymentMethods.length > 0 ? (
            <div className="space-y-3">
              {paymentMethods.map((method, index) => {
                const total = stats.totalRevenue || 1;
                const percentage = (method.value / total) * 100;
                return (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 capitalize">
                        {method.name}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(method.value)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          method.name === "Cash"
                            ? "bg-green-500"
                            : method.name === "Card"
                              ? "bg-blue-500"
                              : "bg-purple-500"
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No payment data available
            </p>
          )}
        </div>

        {/* Top Selling Items */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">
            Top Selling Items
          </h3>
          {topSellingItems.length > 0 ? (
            <div className="space-y-3">
              {topSellingItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="w-6 text-sm font-medium text-gray-500">
                      {index + 1}.
                    </span>
                    <span className="text-sm text-gray-700">{item.name}</span>
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
            <p className="text-gray-500 text-center py-8">
              No sales data available
            </p>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-4">Recent Orders</h3>
        {recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Order #
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Table
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Amount
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentOrders.map((order, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2 text-sm font-medium">
                      #{order.order_number}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {order.table_number
                        ? `Table ${order.table_number}`
                        : "Takeaway"}
                    </td>
                    <td className="px-4 py-2 text-sm font-medium">
                      {formatCurrency(order.total_amount)}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          order.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : order.status === "preparing"
                              ? "bg-blue-100 text-blue-700"
                              : order.status === "ready"
                                ? "bg-green-100 text-green-700"
                                : order.status === "served"
                                  ? "bg-purple-100 text-purple-700"
                                  : order.status === "paid"
                                    ? "bg-gray-100 text-gray-700"
                                    : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {order.created_at
                        ? new Date(order.created_at).toLocaleTimeString()
                        : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No recent orders</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
