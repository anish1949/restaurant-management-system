import React, { useState, useEffect } from "react";
import { financeAPI, orderAPI } from "../services/api";
import { toast } from "react-hot-toast";
import {
  CurrencyDollarIcon,
  BanknotesIcon,
  CreditCardIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  DocumentTextIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Helper function to safely parse numbers
const safeNumber = (value) => {
  if (value === null || value === undefined) return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
};

const Finance = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("month");
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(1)).toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState("sales");
  const [reportData, setReportData] = useState(null);
  const [generating, setGenerating] = useState(false);

  // Financial data states
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    cashPayments: 0,
    cardPayments: 0,
    creditPayments: 0,
  });

  const [dailySales, setDailySales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);

  const [expenseForm, setExpenseForm] = useState({
    category: "",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    payment_method: "cash",
    notes: "",
  });

  const expenseCategoriesList = [
    "Rent",
    "Utilities",
    "Salaries",
    "Food Supplies",
    "Beverage Supplies",
    "Equipment",
    "Marketing",
    "Insurance",
    "Maintenance",
    "License Fees",
    "Taxes",
    "Miscellaneous",
  ];

  const COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#6366f1",
    "#14b8a6",
  ];

  useEffect(() => {
    fetchFinancialData();
  }, [dateRange, startDate, endDate]);

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      // Fetch orders within date range
      const ordersResponse = await orderAPI.getOrders({
        start_date: startDate,
        end_date: endDate,
        payment_status: "paid",
      });

      const orders = ordersResponse.data.data || [];

      // Calculate summary from real orders with safe numbers
      let totalRevenue = 0;
      let cashTotal = 0;
      let cardTotal = 0;
      let creditTotal = 0;

      orders.forEach((order) => {
        const amount = safeNumber(order.total_amount);
        totalRevenue += amount;

        const method = order.payment_method || "cash";
        if (method === "cash") cashTotal += amount;
        else if (method === "card") cardTotal += amount;
        else if (method === "credit") creditTotal += amount;
      });

      // Fetch expenses
      const expensesResponse = await financeAPI.getExpenses({
        start_date: startDate,
        end_date: endDate,
      });
      const expensesData = expensesResponse.data.data || [];
      setExpenses(expensesData);

      let totalExpenses = 0;
      expensesData.forEach((exp) => {
        totalExpenses += safeNumber(exp.amount);
      });

      const netProfit = totalRevenue - totalExpenses;
      const profitMargin =
        totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      setSummary({
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin: profitMargin.toFixed(2),
        cashPayments: cashTotal,
        cardPayments: cardTotal,
        creditPayments: creditTotal,
      });

      // Calculate daily sales for chart
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

      const dailySalesData = Object.values(salesByDate).sort((a, b) =>
        a.date.localeCompare(b.date),
      );
      setDailySales(dailySalesData);

      // Calculate expenses by category
      const expensesByCategory = {};
      expensesData.forEach((exp) => {
        const cat = exp.category || "Other";
        const amount = safeNumber(exp.amount);
        if (!expensesByCategory[cat]) {
          expensesByCategory[cat] = { name: cat, amount: 0 };
        }
        expensesByCategory[cat].amount += amount;
      });
      setExpenseCategories(Object.values(expensesByCategory));

      // Payment methods distribution
      const paymentData = [];
      if (cashTotal > 0) paymentData.push({ name: "Cash", value: cashTotal });
      if (cardTotal > 0) paymentData.push({ name: "Card", value: cardTotal });
      if (creditTotal > 0)
        paymentData.push({ name: "Credit", value: creditTotal });
      setPaymentMethods(paymentData);

      // Recent transactions (mix of orders and expenses)
      const transactions = [
        ...orders.slice(0, 5).map((o) => ({
          id: o.id,
          type: "order",
          description: `Order #${o.order_number}`,
          amount: safeNumber(o.total_amount),
          date: o.created_at,
          status: o.status || "completed",
        })),
        ...expensesData.slice(0, 5).map((e) => ({
          id: e.id,
          type: "expense",
          description: e.description || "Expense",
          amount: -safeNumber(e.amount),
          date: e.expense_date || e.created_at,
          status: e.status || "paid",
        })),
      ]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);

      setRecentTransactions(transactions);
    } catch (error) {
      console.error("Failed to fetch financial data:", error);
      toast.error("Failed to load financial data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      const amount = safeNumber(expenseForm.amount);
      if (amount <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      await financeAPI.createExpense({
        ...expenseForm,
        amount: amount,
      });
      toast.success("Expense added successfully");
      setShowAddExpense(false);
      setExpenseForm({
        category: "",
        amount: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
        payment_method: "cash",
        notes: "",
      });
      fetchFinancialData();
    } catch (error) {
      console.error("Failed to add expense:", error);
      toast.error(error.response?.data?.message || "Failed to add expense");
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense?"))
      return;

    try {
      await financeAPI.deleteExpense(id);
      toast.success("Expense deleted successfully");
      fetchFinancialData();
    } catch (error) {
      console.error("Failed to delete expense:", error);
      toast.error("Failed to delete expense");
    }
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      let data;

      switch (reportType) {
        case "sales":
          // Sales report
          const ordersResponse = await orderAPI.getOrders({
            start_date: startDate,
            end_date: endDate,
            payment_status: "paid",
          });
          const orders = ordersResponse.data.data || [];

          let totalRevenue = 0;
          let cashTotal = 0;
          let cardTotal = 0;
          let creditTotal = 0;

          orders.forEach((o) => {
            const amount = safeNumber(o.total_amount);
            totalRevenue += amount;

            const method = o.payment_method || "cash";
            if (method === "cash") cashTotal += amount;
            else if (method === "card") cardTotal += amount;
            else if (method === "credit") creditTotal += amount;
          });

          data = {
            title: "Sales Report",
            period: `${startDate} to ${endDate}`,
            summary: {
              totalOrders: orders.length,
              totalRevenue,
              averageOrderValue:
                orders.length > 0 ? totalRevenue / orders.length : 0,
              cashTotal,
              cardTotal,
              creditTotal,
            },
            details: orders.map((o) => ({
              date: new Date(o.created_at).toLocaleDateString(),
              number: o.order_number,
              amount: safeNumber(o.total_amount),
              method: o.payment_method || "cash",
              status: o.status || "completed",
            })),
          };
          break;

        case "expense":
          // Expense report
          const expensesResponse = await financeAPI.getExpenses({
            start_date: startDate,
            end_date: endDate,
          });
          const expenses = expensesResponse.data.data || [];

          const byCategory = {};
          let totalExpenses = 0;

          expenses.forEach((e) => {
            const cat = e.category || "Other";
            const amount = safeNumber(e.amount);
            totalExpenses += amount;
            if (!byCategory[cat]) byCategory[cat] = 0;
            byCategory[cat] += amount;
          });

          data = {
            title: "Expense Report",
            period: `${startDate} to ${endDate}`,
            summary: {
              totalExpenses,
              expenseCount: expenses.length,
              byCategory,
            },
            details: expenses.map((e) => ({
              date: e.expense_date || e.created_at,
              category: e.category || "Other",
              description: e.description || "Expense",
              amount: safeNumber(e.amount),
              method: e.payment_method || "cash",
              status: e.status || "paid",
            })),
          };
          break;

        case "profit":
          // Profit & Loss report
          const ordersForPL = await orderAPI.getOrders({
            start_date: startDate,
            end_date: endDate,
            payment_status: "paid",
          });
          const expensesForPL = await financeAPI.getExpenses({
            start_date: startDate,
            end_date: endDate,
          });

          const totalRev = ordersForPL.data.data.reduce(
            (sum, o) => sum + safeNumber(o.total_amount),
            0,
          );
          const totalExp = expensesForPL.data.data.reduce(
            (sum, e) => sum + safeNumber(e.amount),
            0,
          );

          const cashRev = ordersForPL.data.data
            .filter((o) => (o.payment_method || "cash") === "cash")
            .reduce((sum, o) => sum + safeNumber(o.total_amount), 0);

          const cardRev = ordersForPL.data.data
            .filter((o) => (o.payment_method || "cash") === "card")
            .reduce((sum, o) => sum + safeNumber(o.total_amount), 0);

          const creditRev = ordersForPL.data.data
            .filter((o) => (o.payment_method || "cash") === "credit")
            .reduce((sum, o) => sum + safeNumber(o.total_amount), 0);

          const expByCat = {};
          expensesForPL.data.data.forEach((e) => {
            const cat = e.category || "Other";
            expByCat[cat] = (expByCat[cat] || 0) + safeNumber(e.amount);
          });

          data = {
            title: "Profit & Loss Report",
            period: `${startDate} to ${endDate}`,
            revenue: {
              total: totalRev,
              byMethod: {
                cash: cashRev,
                card: cardRev,
                credit: creditRev,
              },
            },
            expenses: {
              total: totalExp,
              byCategory: expByCat,
            },
            summary: {
              grossProfit: totalRev - totalExp,
              profitMargin:
                totalRev > 0
                  ? (((totalRev - totalExp) / totalRev) * 100).toFixed(2)
                  : 0,
            },
          };
          break;

        default:
          return;
      }

      setReportData(data);
      setShowReportModal(true);
    } catch (error) {
      console.error("Failed to generate report:", error);
      toast.error("Failed to generate report");
    } finally {
      setGenerating(false);
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
          <h1 className="text-2xl font-bold text-gray-800">
            Finance & Accounting
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time financial data from your restaurant
          </p>
        </div>
        <div className="flex space-x-3">
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={() => setShowAddExpense(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Expense
          </button>
        </div>
      </div>

      {/* KPI Cards - Real Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">
                {formatCurrency(summary.totalRevenue)}
              </h3>
            </div>
            <div className="bg-green-100 p-2 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500">From {dailySales.length} days</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm text-gray-500">Total Expenses</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">
                {formatCurrency(summary.totalExpenses)}
              </h3>
            </div>
            <div className="bg-red-100 p-2 rounded-lg">
              <BanknotesIcon className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500">
            {expenses.length} expense entries
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm text-gray-500">Net Profit</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">
                {formatCurrency(summary.netProfit)}
              </h3>
            </div>
            <div className="bg-blue-100 p-2 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Margin: {summary.profitMargin}%
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm text-gray-500">Payment Methods</p>
              <p className="text-sm font-medium text-gray-800 mt-1">
                Cash: {formatCurrency(summary.cashPayments)}
              </p>
              <p className="text-xs text-gray-500">
                Card: {formatCurrency(summary.cardPayments)}
              </p>
              <p className="text-xs text-gray-500">
                Credit: {formatCurrency(summary.creditPayments)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts - Real Data */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Daily Sales Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">Daily Sales</h3>
          <div style={{ width: "100%", height: "300px" }}>
            <ResponsiveContainer>
              <BarChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis
                  tickFormatter={(value) => `₹${safeNumber(value) / 1000}k`}
                />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="sales" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Categories Chart */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">
            Expenses by Category
          </h3>
          <div style={{ width: "100%", height: "300px" }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={expenseCategories}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="amount"
                  label={(entry) => entry.name}
                >
                  {expenseCategories.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-4">
          Recent Transactions
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Date
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Description
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Type
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Amount
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentTransactions.map((transaction, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-2 text-sm">
                    {transaction.date
                      ? new Date(transaction.date).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {transaction.description}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        transaction.type === "order"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {transaction.type}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-2 text-sm font-medium ${
                      transaction.amount > 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {formatCurrency(Math.abs(transaction.amount))}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        transaction.status === "completed" ||
                        transaction.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {transaction.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {transaction.type === "expense" && (
                      <button
                        onClick={() => handleDeleteExpense(transaction.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete expense"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {recentTransactions.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No transactions found for this period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Generation Section */}
      <div className="mt-6 bg-white rounded-xl shadow-sm p-5 border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-4">Generate Reports</h3>
        <div className="flex items-center space-x-4">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="sales">Sales Report</option>
            <option value="expense">Expense Report</option>
            <option value="profit">Profit & Loss Report</option>
          </select>
          <button
            onClick={handleGenerateReport}
            disabled={generating}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center"
          >
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            {generating ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add Expense</h2>
              <button
                onClick={() => setShowAddExpense(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={expenseForm.category}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, category: e.target.value })
                  }
                  className="w-full border rounded-lg p-2"
                  required
                >
                  <option value="">Select category</option>
                  {expenseCategoriesList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={expenseForm.amount}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, amount: e.target.value })
                  }
                  className="w-full border rounded-lg p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full border rounded-lg p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, date: e.target.value })
                  }
                  className="w-full border rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={expenseForm.payment_method}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      payment_method: e.target.value,
                    })
                  }
                  className="w-full border rounded-lg p-2"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={expenseForm.notes}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, notes: e.target.value })
                  }
                  className="w-full border rounded-lg p-2"
                  rows="2"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddExpense(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && reportData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold">{reportData.title}</h2>
                <p className="text-sm text-gray-500">{reportData.period}</p>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Report content based on type */}
            {reportType === "sales" && (
              <div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-500">Total Orders</p>
                    <p className="text-xl font-bold">
                      {reportData.summary.totalOrders}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-500">Total Revenue</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(reportData.summary.totalRevenue)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-500">Average Order</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(reportData.summary.averageOrderValue)}
                    </p>
                  </div>
                </div>

                <h3 className="font-semibold mb-2">Order Details</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-left text-xs">Date</th>
                        <th className="px-4 py-2 text-left text-xs">Order #</th>
                        <th className="px-4 py-2 text-left text-xs">Amount</th>
                        <th className="px-4 py-2 text-left text-xs">Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.details.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm">{item.date}</td>
                          <td className="px-4 py-2 text-sm">{item.number}</td>
                          <td className="px-4 py-2 text-sm font-medium">
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="px-4 py-2 text-sm capitalize">
                            {item.method}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reportType === "expense" && (
              <div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-500">Total Expenses</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(reportData.summary.totalExpenses)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-500">Number of Expenses</p>
                    <p className="text-xl font-bold">
                      {reportData.summary.expenseCount}
                    </p>
                  </div>
                </div>

                <h3 className="font-semibold mb-2">By Category</h3>
                <div className="space-y-2 mb-4">
                  {Object.entries(reportData.summary.byCategory).map(
                    ([cat, amount]) => (
                      <div key={cat} className="flex justify-between text-sm">
                        <span>{cat}</span>
                        <span className="font-medium">
                          {formatCurrency(amount)}
                        </span>
                      </div>
                    ),
                  )}
                </div>

                <h3 className="font-semibold mb-2">Expense Details</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-left text-xs">Date</th>
                        <th className="px-4 py-2 text-left text-xs">
                          Category
                        </th>
                        <th className="px-4 py-2 text-left text-xs">
                          Description
                        </th>
                        <th className="px-4 py-2 text-left text-xs">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.details.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm">{item.date}</td>
                          <td className="px-4 py-2 text-sm">{item.category}</td>
                          <td className="px-4 py-2 text-sm">
                            {item.description}
                          </td>
                          <td className="px-4 py-2 text-sm font-medium text-red-600">
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reportType === "profit" && (
              <div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-green-50 p-4 rounded">
                    <p className="text-xs text-green-600">Revenue</p>
                    <p className="text-2xl font-bold text-green-700">
                      {formatCurrency(reportData.revenue.total)}
                    </p>
                  </div>
                  <div className="bg-red-50 p-4 rounded">
                    <p className="text-xs text-red-600">Expenses</p>
                    <p className="text-2xl font-bold text-red-700">
                      {formatCurrency(reportData.expenses.total)}
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded mb-6">
                  <p className="text-xs text-blue-600">Net Profit</p>
                  <p className="text-3xl font-bold text-blue-700">
                    {formatCurrency(reportData.summary.grossProfit)}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    Margin: {reportData.summary.profitMargin}%
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2">Revenue Breakdown</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Cash</span>
                        <span className="font-medium">
                          {formatCurrency(reportData.revenue.byMethod.cash)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Card</span>
                        <span className="font-medium">
                          {formatCurrency(reportData.revenue.byMethod.card)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Credit</span>
                        <span className="font-medium">
                          {formatCurrency(reportData.revenue.byMethod.credit)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Expense Breakdown</h3>
                    <div className="space-y-2">
                      {Object.entries(reportData.expenses.byCategory).map(
                        ([cat, amount]) => (
                          <div
                            key={cat}
                            className="flex justify-between text-sm"
                          >
                            <span>{cat}</span>
                            <span className="font-medium">
                              {formatCurrency(amount)}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Print Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;
