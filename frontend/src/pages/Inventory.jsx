import React, { useState, useEffect } from "react";
import { inventoryAPI } from "../services/api";
import { toast } from "react-hot-toast";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [adjustQuantity, setAdjustQuantity] = useState({
    quantity: 0,
    operation: "add",
  });

  const [formData, setFormData] = useState({
    item_name: "",
    category_id: "",
    quantity: "",
    unit: "kg",
    reorder_level: "",
    unit_cost: "",
    supplier_id: "",
    min_quantity: "",
    max_quantity: "",
    location: "",
    expiry_date: "",
    batch_number: "",
    notes: "",
  });

  const units = ["kg", "g", "l", "ml", "pcs", "box", "pack", "dozen"];

  useEffect(() => {
    loadInventory();
    loadCategories();
  }, [filterLowStock]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const params = filterLowStock ? { low_stock: true } : {};
      const response = await inventoryAPI.getInventory(params);
      setInventory(response.data.data || []);
    } catch (error) {
      console.error("Failed to load inventory:", error);
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await inventoryAPI.getCategories();
      setCategories(response.data.data || []);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.item_name || !formData.quantity) {
      toast.error("Item name and quantity are required");
      return;
    }

    try {
      setLoading(true);
      const response = await inventoryAPI.createItem(formData);
      if (response.data.success) {
        toast.success("Item added successfully");
        setShowAddModal(false);
        resetForm();
        loadInventory();
      }
    } catch (error) {
      console.error("Failed to add item:", error);
      toast.error(error.response?.data?.message || "Failed to add item");
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    try {
      setLoading(true);
      const response = await inventoryAPI.updateItem(selectedItem.id, formData);
      if (response.data.success) {
        toast.success("Item updated successfully");
        setShowEditModal(false);
        setSelectedItem(null);
        resetForm();
        loadInventory();
      }
    } catch (error) {
      console.error("Failed to update item:", error);
      toast.error(error.response?.data?.message || "Failed to update item");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItem) return;

    try {
      setLoading(true);
      const response = await inventoryAPI.deleteItem(selectedItem.id);
      if (response.data.success) {
        toast.success("Item deleted successfully");
        setShowDeleteModal(false);
        setSelectedItem(null);
        loadInventory();
      }
    } catch (error) {
      console.error("Failed to delete item:", error);
      toast.error(error.response?.data?.message || "Failed to delete item");
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustQuantity = async () => {
    if (!selectedItem) return;
    if (!adjustQuantity.quantity || adjustQuantity.quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    try {
      setLoading(true);
      const response = await inventoryAPI.updateQuantity(selectedItem.id, {
        quantity: adjustQuantity.quantity,
        operation: adjustQuantity.operation,
      });

      if (response.data.success) {
        toast.success(
          `Quantity ${adjustQuantity.operation === "add" ? "added" : "subtracted"} successfully`,
        );
        setShowAdjustModal(false);
        setSelectedItem(null);
        setAdjustQuantity({ quantity: 0, operation: "add" });
        loadInventory();
      }
    } catch (error) {
      console.error("Failed to adjust quantity:", error);
      toast.error(error.response?.data?.message || "Failed to adjust quantity");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      item_name: "",
      category_id: "",
      quantity: "",
      unit: "kg",
      reorder_level: "",
      unit_cost: "",
      supplier_id: "",
      min_quantity: "",
      max_quantity: "",
      location: "",
      expiry_date: "",
      batch_number: "",
      notes: "",
    });
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setFormData({
      item_name: item.item_name || "",
      category_id: item.category_id || "",
      quantity: item.quantity || "",
      unit: item.unit || "kg",
      reorder_level: item.reorder_level || "",
      unit_cost: item.unit_cost || "",
      supplier_id: item.supplier_id || "",
      min_quantity: item.min_quantity || "",
      max_quantity: item.max_quantity || "",
      location: item.location || "",
      expiry_date: item.expiry_date ? item.expiry_date.split("T")[0] : "",
      batch_number: item.batch_number || "",
      notes: item.notes || "",
    });
    setShowEditModal(true);
  };

  const openAdjustModal = (item) => {
    setSelectedItem(item);
    setAdjustQuantity({ quantity: 0, operation: "add" });
    setShowAdjustModal(true);
  };

  const filteredItems = inventory.filter(
    (item) =>
      item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getStockStatus = (item) => {
    if (item.quantity <= item.reorder_level) {
      return {
        label: "Low Stock",
        color: "bg-red-100 text-red-800",
        icon: ExclamationTriangleIcon,
      };
    } else if (item.quantity <= item.reorder_level * 2) {
      return {
        label: "Medium Stock",
        color: "bg-yellow-100 text-yellow-800",
        icon: ArrowPathIcon,
      };
    } else {
      return {
        label: "Good Stock",
        color: "bg-green-100 text-green-800",
        icon: CubeIcon,
      };
    }
  };

  const calculateTotalValue = () => {
    return inventory.reduce(
      (sum, item) => sum + item.quantity * (item.unit_cost || 0),
      0,
    );
  };

  if (loading && !inventory.length) {
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
            Inventory Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {inventory.length} total items •{" "}
            {inventory.filter((i) => i.quantity <= i.reorder_level).length} low
            stock
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Item
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Total Items</p>
          <p className="text-2xl font-bold text-gray-800">{inventory.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Low Stock</p>
          <p className="text-2xl font-bold text-red-600">
            {inventory.filter((i) => i.quantity <= i.reorder_level).length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Total Value</p>
          <p className="text-2xl font-bold text-green-600">
            ₹{calculateTotalValue().toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Categories</p>
          <p className="text-2xl font-bold text-blue-600">
            {categories.length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search items by name, category or location..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filterLowStock}
              onChange={(e) => setFilterLowStock(e.target.checked)}
              className="h-4 w-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Show low stock only</span>
          </label>
        </div>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => {
          const status = getStockStatus(item);
          const StatusIcon = status.icon;
          return (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-sm p-4 border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">
                    {item.item_name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {item.category_name || "Uncategorized"}
                  </p>
                  {item.batch_number && (
                    <p className="text-xs text-gray-400 mt-1">
                      Batch: {item.batch_number}
                    </p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => openAdjustModal(item)}
                    className="text-gray-400 hover:text-blue-600"
                    title="Adjust Quantity"
                  >
                    <ArrowPathIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => openEditModal(item)}
                    className="text-gray-400 hover:text-green-600"
                    title="Edit Item"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedItem(item);
                      setShowDeleteModal(true);
                    }}
                    className="text-gray-400 hover:text-red-600"
                    title="Delete Item"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {/* Quantity and Status */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <StatusIcon
                      className={`h-4 w-4 ${status.color.split(" ")[1]}`}
                    />
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${status.color}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-primary-600">
                      {item.quantity}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">
                      {item.unit}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      status.label === "Low Stock"
                        ? "bg-red-500"
                        : status.label === "Medium Stock"
                          ? "bg-yellow-500"
                          : "bg-green-500"
                    }`}
                    style={{
                      width: `${Math.min(100, (item.quantity / (item.reorder_level * 3)) * 100)}%`,
                    }}
                  ></div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-sm pt-2">
                  <div>
                    <p className="text-gray-500">Unit Cost</p>
                    <p className="font-medium">₹{item.unit_cost || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total Value</p>
                    <p className="font-medium text-green-600">
                      ₹
                      {((item.quantity || 0) * (item.unit_cost || 0)).toFixed(
                        2,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Reorder Level</p>
                    <p className="font-medium">
                      {item.reorder_level || 0} {item.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Min/Max</p>
                    <p className="font-medium">
                      {item.min_quantity || 0} / {item.max_quantity || 0}
                    </p>
                  </div>
                </div>

                {/* Location */}
                {item.location && (
                  <p className="text-xs text-gray-500 flex items-center mt-2">
                    <span className="mr-1">📍</span> {item.location}
                  </p>
                )}

                {/* Expiry Warning */}
                {item.expiry_date &&
                  new Date(item.expiry_date) < new Date() && (
                    <p className="text-xs text-red-600 flex items-center mt-2">
                      <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                      Expired on{" "}
                      {new Date(item.expiry_date).toLocaleDateString()}
                    </p>
                  )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full my-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add Inventory Item</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={formData.item_name}
                    onChange={(e) =>
                      setFormData({ ...formData, item_name: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) =>
                      setFormData({ ...formData, category_id: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier ID
                  </label>
                  <input
                    type="number"
                    value={formData.supplier_id}
                    onChange={(e) =>
                      setFormData({ ...formData, supplier_id: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Cost (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unit_cost}
                    onChange={(e) =>
                      setFormData({ ...formData, unit_cost: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reorder Level
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.reorder_level}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        reorder_level: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Quantity
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.min_quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, min_quantity: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Quantity
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.max_quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, max_quantity: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Shelf A1, Freezer 2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    value={formData.batch_number}
                    onChange={(e) =>
                      setFormData({ ...formData, batch_number: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) =>
                      setFormData({ ...formData, expiry_date: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                    rows="2"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {loading ? "Adding..." : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full my-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit Inventory Item</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedItem(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleEditItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={formData.item_name}
                    onChange={(e) =>
                      setFormData({ ...formData, item_name: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) =>
                      setFormData({ ...formData, category_id: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier ID
                  </label>
                  <input
                    type="number"
                    value={formData.supplier_id}
                    onChange={(e) =>
                      setFormData({ ...formData, supplier_id: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Cost (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unit_cost}
                    onChange={(e) =>
                      setFormData({ ...formData, unit_cost: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reorder Level
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.reorder_level}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        reorder_level: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Quantity
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.min_quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, min_quantity: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Quantity
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.max_quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, max_quantity: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    value={formData.batch_number}
                    onChange={(e) =>
                      setFormData({ ...formData, batch_number: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) =>
                      setFormData({ ...formData, expiry_date: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                    rows="2"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedItem(null);
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
                  {loading ? "Updating..." : "Update Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Quantity Modal */}
      {showAdjustModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">
              Adjust Quantity - {selectedItem.item_name}
            </h3>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Current Quantity:{" "}
                <span className="font-bold">
                  {selectedItem.quantity} {selectedItem.unit}
                </span>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operation
                </label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() =>
                      setAdjustQuantity({ ...adjustQuantity, operation: "add" })
                    }
                    className={`flex-1 py-2 rounded-lg text-sm ${
                      adjustQuantity.operation === "add"
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAdjustQuantity({
                        ...adjustQuantity,
                        operation: "subtract",
                      })
                    }
                    className={`flex-1 py-2 rounded-lg text-sm ${
                      adjustQuantity.operation === "subtract"
                        ? "bg-red-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Subtract
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={adjustQuantity.quantity}
                  onChange={(e) =>
                    setAdjustQuantity({
                      ...adjustQuantity,
                      quantity: parseFloat(e.target.value),
                    })
                  }
                  className="w-full border rounded-lg p-2"
                  placeholder="Enter quantity"
                />
              </div>

              {adjustQuantity.operation === "subtract" &&
                adjustQuantity.quantity > selectedItem.quantity && (
                  <p className="text-sm text-red-600">
                    Cannot subtract more than current quantity (
                    {selectedItem.quantity})
                  </p>
                )}
            </div>

            <div className="flex space-x-2 mt-6">
              <button
                onClick={() => {
                  setShowAdjustModal(false);
                  setSelectedItem(null);
                }}
                className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjustQuantity}
                disabled={
                  loading ||
                  !adjustQuantity.quantity ||
                  adjustQuantity.quantity <= 0 ||
                  (adjustQuantity.operation === "subtract" &&
                    adjustQuantity.quantity > selectedItem.quantity)
                }
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? "Adjusting..." : "Apply"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Delete Item</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete{" "}
              <span className="font-semibold">{selectedItem.item_name}</span>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedItem(null);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteItem}
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

export default Inventory;
