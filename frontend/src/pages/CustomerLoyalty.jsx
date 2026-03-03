import React, { useState, useEffect } from "react";
import { customerAPI } from "../services/api";
import { toast } from "react-hot-toast";
import {
  UserPlusIcon,
  MagnifyingGlassIcon,
  StarIcon,
  GiftIcon,
  PhoneIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";

const CustomerLoyalty = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [customerForm, setCustomerForm] = useState({
    full_name: "",
    phone: "",
  });

  const [pointsData, setPointsData] = useState({
    points: 0,
    description: "",
    type: "earn",
  });

  const tiers = [
    { name: "bronze", color: "bg-amber-600", minPoints: 0, multiplier: 1 },
    { name: "silver", color: "bg-gray-400", minPoints: 1000, multiplier: 1.2 },
    { name: "gold", color: "bg-yellow-500", minPoints: 5000, multiplier: 1.5 },
    {
      name: "platinum",
      color: "bg-purple-600",
      minPoints: 10000,
      multiplier: 2,
    },
  ];

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await customerAPI.getCustomers();
      setCustomers(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();

    if (!customerForm.full_name || !customerForm.phone) {
      toast.error("Name and phone are required");
      return;
    }

    try {
      setLoading(true);
      const response = await customerAPI.createCustomer(customerForm);
      if (response.data.success) {
        toast.success("Customer added successfully");
        setShowCustomerModal(false);
        resetForm();
        fetchCustomers();
      }
    } catch (error) {
      console.error("Failed to add customer:", error);
      toast.error(error.response?.data?.message || "Failed to add customer");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    if (!editingCustomer) return;

    if (!customerForm.full_name || !customerForm.phone) {
      toast.error("Name and phone are required");
      return;
    }

    try {
      setLoading(true);
      const response = await customerAPI.updateCustomer(
        editingCustomer.id,
        customerForm,
      );
      if (response.data.success) {
        toast.success("Customer updated successfully");
        setShowCustomerModal(false);
        setEditingCustomer(null);
        resetForm();
        fetchCustomers();
      }
    } catch (error) {
      console.error("Failed to update customer:", error);
      toast.error(error.response?.data?.message || "Failed to update customer");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;

    try {
      setLoading(true);
      const response = await customerAPI.deleteCustomer(selectedCustomer.id);
      if (response.data.success) {
        toast.success("Customer deleted successfully");
        setShowDeleteModal(false);
        setSelectedCustomer(null);
        fetchCustomers();
      }
    } catch (error) {
      console.error("Failed to delete customer:", error);
      toast.error(error.response?.data?.message || "Failed to delete customer");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPoints = async () => {
    if (!selectedCustomer) return;

    if (!pointsData.points || pointsData.points <= 0) {
      toast.error("Please enter valid points");
      return;
    }

    try {
      setLoading(true);
      const response = await customerAPI.addLoyaltyPoints(selectedCustomer.id, {
        points: pointsData.points,
        description: pointsData.description,
      });

      if (response.data.success) {
        toast.success(`${pointsData.points} points added successfully`);
        setShowPointsModal(false);
        setPointsData({ points: 0, description: "", type: "earn" });
        fetchCustomers();
      }
    } catch (error) {
      console.error("Failed to add points:", error);
      toast.error(error.response?.data?.message || "Failed to add points");
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemPoints = async () => {
    if (!selectedCustomer) return;

    if (!pointsData.points || pointsData.points <= 0) {
      toast.error("Please enter valid points");
      return;
    }

    if (pointsData.points > (selectedCustomer.points_balance || 0)) {
      toast.error("Insufficient points balance");
      return;
    }

    try {
      setLoading(true);
      const response = await customerAPI.redeemLoyaltyPoints(
        selectedCustomer.id,
        {
          points: pointsData.points,
          description: pointsData.description,
        },
      );

      if (response.data.success) {
        toast.success(`${pointsData.points} points redeemed successfully`);
        setShowPointsModal(false);
        setPointsData({ points: 0, description: "", type: "earn" });
        fetchCustomers();
      }
    } catch (error) {
      console.error("Failed to redeem points:", error);
      toast.error(error.response?.data?.message || "Failed to redeem points");
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (customer) => {
    setEditingCustomer(customer);
    setCustomerForm({
      full_name: customer.full_name || "",
      phone: customer.phone || "",
    });
    setShowCustomerModal(true);
  };

  const resetForm = () => {
    setCustomerForm({
      full_name: "",
      phone: "",
    });
  };

  const getTierInfo = (points) => {
    let tier = tiers[0];
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (points >= tiers[i].minPoints) {
        tier = tiers[i];
        break;
      }
    }
    return tier;
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm),
  );

  const getNextTier = (points) => {
    for (let i = 0; i < tiers.length - 1; i++) {
      if (points < tiers[i + 1].minPoints) {
        return {
          name: tiers[i + 1].name,
          pointsNeeded: tiers[i + 1].minPoints - points,
          progress: (points / tiers[i + 1].minPoints) * 100,
        };
      }
    }
    return null;
  };

  if (loading && !customers.length) {
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
          <h1 className="text-2xl font-bold text-gray-800">Customer Loyalty</h1>
          <p className="text-sm text-gray-500 mt-1">
            {customers.length} total customers
          </p>
        </div>
        <button
          onClick={() => {
            setEditingCustomer(null);
            resetForm();
            setShowCustomerModal(true);
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center"
        >
          <UserPlusIcon className="h-5 w-5 mr-2" />
          Add Customer
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg mr-4">
              <UserGroupIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Customers</p>
              <p className="text-2xl font-bold text-gray-800">
                {customers.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-lg mr-4">
              <StarIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Points</p>
              <p className="text-2xl font-bold text-gray-800">
                {customers
                  .reduce((sum, c) => sum + (c.points_balance || 0), 0)
                  .toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg mr-4">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Spent</p>
              <p className="text-2xl font-bold text-gray-800">
                ₹
                {customers
                  .reduce((sum, c) => sum + (c.total_spent || 0), 0)
                  .toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers by name or phone..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Customer Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => {
          const tier = getTierInfo(customer.points_balance || 0);
          const nextTier = getNextTier(customer.points_balance || 0);

          return (
            <div
              key={customer.id}
              className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:shadow-md transition-shadow cursor-pointer relative group"
              onClick={() => setSelectedCustomer(customer)}
            >
              {/* Edit/Delete buttons */}
              <div className="absolute top-2 right-2 hidden group-hover:flex space-x-1 z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(customer);
                  }}
                  className="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                  title="Edit customer"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCustomer(customer);
                    setShowDeleteModal(true);
                  }}
                  className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200"
                  title="Delete customer"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-start mb-3">
                <div
                  className={`w-12 h-12 ${tier.color} bg-opacity-20 rounded-full flex items-center justify-center text-${tier.color.replace("bg-", "")} font-bold text-lg mr-3`}
                >
                  {customer.full_name?.charAt(0) || "C"}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800">
                    {customer.full_name}
                  </h3>
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <PhoneIcon className="h-3 w-3 mr-1 text-gray-400" />
                    {customer.phone}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Member since{" "}
                    {new Date(customer.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Loyalty Points
                  </span>
                  <span className="text-lg font-bold text-primary-600">
                    {customer.points_balance || 0}
                  </span>
                </div>

                {/* Progress to next tier */}
                {nextTier && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">
                        Next: {nextTier.name}
                      </span>
                      <span className="text-gray-500">
                        {nextTier.pointsNeeded} points needed
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-primary-600 h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(100, nextTier.progress)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-gray-500">Total Spent</p>
                  <p className="font-medium text-gray-800">
                    ₹{customer.total_spent?.toLocaleString() || 0}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Visits</p>
                  <p className="font-medium text-gray-800">
                    {customer.total_visits || 0}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">
                  {selectedCustomer.full_name}
                </h2>
                <p className="text-sm text-gray-500">Customer Details</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    openEditModal(selectedCustomer);
                    setSelectedCustomer(null);
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="Edit customer"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(true);
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  title="Delete customer"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Customer Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Phone</p>
                <p className="font-medium">{selectedCustomer.phone}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Member Since</p>
                <p className="font-medium">
                  {new Date(selectedCustomer.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Loyalty Section */}
            <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-800">Loyalty Program</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setPointsData({
                        points: 0,
                        description: "",
                        type: "earn",
                      });
                      setShowPointsModal(true);
                    }}
                    className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-700"
                  >
                    Add Points
                  </button>
                  <button
                    onClick={() => {
                      setPointsData({
                        points: 0,
                        description: "",
                        type: "redeem",
                      });
                      setShowPointsModal(true);
                    }}
                    className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700"
                  >
                    Redeem
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Current Balance</p>
                  <p className="text-3xl font-bold text-primary-600">
                    {selectedCustomer.points_balance || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Lifetime Points</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {selectedCustomer.lifetime_points || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tier</p>
                  <p className="text-xl font-bold capitalize text-purple-600">
                    {getTierInfo(selectedCustomer.points_balance || 0).name}
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <h3 className="font-semibold text-gray-800 mb-3">Recent Orders</h3>
            <div className="space-y-2 mb-6">
              {selectedCustomer.recent_orders?.map((order, idx) => (
                <div
                  key={idx}
                  className="bg-gray-50 rounded-lg p-3 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">#{order.order_number}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-600">
                      ₹{order.total_amount}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {order.status}
                    </p>
                  </div>
                </div>
              ))}
              {(!selectedCustomer.recent_orders ||
                selectedCustomer.recent_orders.length === 0) && (
                <p className="text-center text-gray-500 py-4">No orders yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingCustomer ? "Edit Customer" : "Add New Customer"}
              </h2>
              <button
                onClick={() => {
                  setShowCustomerModal(false);
                  setEditingCustomer(null);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form
              onSubmit={
                editingCustomer ? handleUpdateCustomer : handleCreateCustomer
              }
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={customerForm.full_name}
                  onChange={(e) =>
                    setCustomerForm({
                      ...customerForm,
                      full_name: e.target.value,
                    })
                  }
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter customer name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={customerForm.phone}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, phone: e.target.value })
                  }
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter phone number"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomerModal(false);
                    setEditingCustomer(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {loading
                    ? "Saving..."
                    : editingCustomer
                      ? "Update Customer"
                      : "Add Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Points Modal */}
      {showPointsModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {pointsData.type === "earn" ? "Add Points" : "Redeem Points"}
              </h2>
              <button
                onClick={() => setShowPointsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Customer:{" "}
              <span className="font-medium">{selectedCustomer.full_name}</span>
              <br />
              Current Balance:{" "}
              <span className="font-bold text-primary-600">
                {selectedCustomer.points_balance || 0}
              </span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Points
                </label>
                <input
                  type="number"
                  value={pointsData.points}
                  onChange={(e) =>
                    setPointsData({
                      ...pointsData,
                      points: parseInt(e.target.value),
                    })
                  }
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  min="1"
                  max={
                    pointsData.type === "redeem"
                      ? selectedCustomer.points_balance
                      : undefined
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={pointsData.description}
                  onChange={(e) =>
                    setPointsData({
                      ...pointsData,
                      description: e.target.value,
                    })
                  }
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Birthday bonus, Order #123"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowPointsModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={
                  pointsData.type === "earn"
                    ? handleAddPoints
                    : handleRedeemPoints
                }
                disabled={loading}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {loading
                  ? "Processing..."
                  : pointsData.type === "earn"
                    ? "Add Points"
                    : "Redeem Points"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Delete Customer</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                {selectedCustomer.full_name}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedCustomer(null);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCustomer}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerLoyalty;
