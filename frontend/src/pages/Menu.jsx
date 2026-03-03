import React, { useState, useEffect } from "react";
import { menuAPI } from "../services/api";
import { toast } from "react-hot-toast";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  EyeSlashIcon,
  StarIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  CubeIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const Menu = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showItemModal, setShowItemModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [selectedItems, setSelectedItems] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");

  // Get unique categories from menu items
  const categories = [
    ...new Set(menuItems.map((item) => item.category_name).filter(Boolean)),
  ];

  const [newItem, setNewItem] = useState({
    category_name: "",
    name: "",
    description: "",
    price: "",
    cost: "",
    is_available: true,
    is_vegetarian: false,
    is_vegan: false,
    is_gluten_free: false,
    is_spicy: false,
    is_signature: false,
    is_special: false,
    preparation_time: "",
    tax_rate: 10,
    discount_allowed: true,
    track_inventory: false,
    stock_quantity: "",
    reorder_level: "",
  });

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const response = await menuAPI.getItems();
      setMenuItems(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch menu items:", error);
      toast.error("Failed to load menu items");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!newItem.name || !newItem.price) {
      toast.error("Name and price are required");
      return;
    }

    try {
      setLoading(true);
      if (editingItem) {
        // Update existing item
        const response = await menuAPI.updateItem(editingItem.id, newItem);
        if (response.data.success) {
          toast.success("Item updated successfully");
        }
      } else {
        // Create new item
        const response = await menuAPI.createItem(newItem);
        if (response.data.success) {
          toast.success("Item created successfully");
        }
      }
      setShowItemModal(false);
      setEditingItem(null);
      resetItemForm();
      fetchMenuItems();
    } catch (error) {
      console.error("Failed to save item:", error);
      toast.error(
        error.response?.data?.message ||
          (editingItem ? "Failed to update item" : "Failed to create item"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setNewItem({
      category_name: item.category_name || "",
      name: item.name,
      description: item.description || "",
      price: item.price,
      cost: item.cost || "",
      is_available: item.is_available,
      is_vegetarian: item.is_vegetarian || false,
      is_vegan: item.is_vegan || false,
      is_gluten_free: item.is_gluten_free || false,
      is_spicy: item.is_spicy || false,
      is_signature: item.is_signature || false,
      is_special: item.is_special || false,
      preparation_time: item.preparation_time || "",
      tax_rate: item.tax_rate || 10,
      discount_allowed: item.discount_allowed !== false,
      track_inventory: item.track_inventory || false,
      stock_quantity: item.stock_quantity || "",
      reorder_level: item.reorder_level || "",
    });
    setShowItemModal(true);
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;

    try {
      setLoading(true);
      // Note: You'll need to add delete endpoint to your API
      // await menuAPI.deleteItem(itemToDelete.id);

      // For now, just remove from local state
      setMenuItems(menuItems.filter((item) => item.id !== itemToDelete.id));
      toast.success("Item deleted successfully");
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Failed to delete item:", error);
      toast.error("Failed to delete item");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async (id) => {
    try {
      setLoading(true);
      const response = await menuAPI.toggleAvailability(id);
      if (response.data.success) {
        toast.success("Item availability updated");
        // Update local state
        setMenuItems(
          menuItems.map((item) =>
            item.id === id
              ? { ...item, is_available: !item.is_available }
              : item,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to update availability:", error);
      toast.error("Failed to update availability");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedItems.length === 0) {
      toast.error("No items selected");
      return;
    }

    try {
      setLoading(true);
      // Note: You'll need to add bulk update endpoint to your API
      // await menuAPI.bulkUpdate({ items: selectedItems, action });

      // Update local state
      if (action === "activate") {
        setMenuItems(
          menuItems.map((item) =>
            selectedItems.includes(item.id)
              ? { ...item, is_available: true }
              : item,
          ),
        );
        toast.success(`${selectedItems.length} items activated`);
      } else if (action === "deactivate") {
        setMenuItems(
          menuItems.map((item) =>
            selectedItems.includes(item.id)
              ? { ...item, is_available: false }
              : item,
          ),
        );
        toast.success(`${selectedItems.length} items deactivated`);
      }

      setSelectedItems([]);
    } catch (error) {
      console.error("Bulk action failed:", error);
      toast.error("Bulk action failed");
    } finally {
      setLoading(false);
    }
  };

  const handleExportMenu = () => {
    try {
      const headers = [
        "Category",
        "Item Name",
        "Price",
        "Cost",
        "Status",
        "Vegetarian",
        "Spicy",
        "Prep Time",
      ];
      const csvRows = [headers.join(",")];

      menuItems.forEach((item) => {
        const row = [
          `"${item.category_name || ""}"`,
          `"${item.name}"`,
          item.price,
          item.cost || "",
          item.is_available ? "Active" : "Inactive",
          item.is_vegetarian ? "Yes" : "No",
          item.is_spicy ? "Yes" : "No",
          item.preparation_time || "",
        ];
        csvRows.push(row.join(","));
      });

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `menu_export_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Menu exported successfully");
    } catch (error) {
      console.error("Failed to export menu:", error);
      toast.error("Failed to export menu");
    }
  };

  const resetItemForm = () => {
    setNewItem({
      category_name: "",
      name: "",
      description: "",
      price: "",
      cost: "",
      is_available: true,
      is_vegetarian: false,
      is_vegan: false,
      is_gluten_free: false,
      is_spicy: false,
      is_signature: false,
      is_special: false,
      preparation_time: "",
      tax_rate: 10,
      discount_allowed: true,
      track_inventory: false,
      stock_quantity: "",
      reorder_level: "",
    });
  };

  // Filter items based on search, category, and status
  const filteredItems = menuItems.filter((item) => {
    const matchesSearch =
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || item.category_name === categoryFilter;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && item.is_available) ||
      (filterStatus === "inactive" && !item.is_available);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleSelectItem = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id)
        ? prev.filter((itemId) => itemId !== id)
        : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map((item) => item.id));
    }
  };

  const calculateProfit = (price, cost) => {
    if (!price || !cost) return null;
    const profit = price - cost;
    const margin = (profit / price) * 100;
    return { profit, margin };
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Menu Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            {menuItems.length} total items •{" "}
            {menuItems.filter((i) => i.is_available).length} active
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* View Toggle */}
          <div className="bg-white rounded-lg shadow flex">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-2 rounded-l-lg ${viewMode === "grid" ? "bg-primary-600 text-white" : "hover:bg-gray-100"}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-2 rounded-r-lg ${viewMode === "list" ? "bg-primary-600 text-white" : "hover:bg-gray-100"}`}
            >
              List
            </button>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportMenu}
            className="bg-white border rounded-lg px-3 py-2 text-sm hover:bg-gray-50 flex items-center"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
            Export
          </button>

          {/* Bulk Edit Button */}
          {selectedItems.length > 0 && (
            <button
              onClick={() => setShowBulkEditModal(true)}
              className="bg-white border rounded-lg px-3 py-2 text-sm hover:bg-gray-50 flex items-center"
            >
              <AdjustmentsHorizontalIcon className="h-4 w-4 mr-1" />
              Bulk Edit ({selectedItems.length})
            </button>
          )}

          {/* Add Item Button */}
          <button
            onClick={() => {
              setEditingItem(null);
              resetItemForm();
              setShowItemModal(true);
            }}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Item
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="col-span-2">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search menu items..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedItems.length > 0 && (
          <div className="flex items-center space-x-4 pt-4 mt-4 border-t">
            <span className="text-sm font-medium">
              {selectedItems.length} items selected
            </span>
            <button
              onClick={() => handleBulkAction("activate")}
              className="text-sm text-green-600 hover:text-green-800"
            >
              Activate
            </button>
            <button
              onClick={() => handleBulkAction("deactivate")}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Deactivate
            </button>
            <button
              onClick={() => setSelectedItems([])}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Menu Items Display - Grid View */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => {
            const profit = calculateProfit(item.price, item.cost);

            return (
              <div
                key={item.id}
                className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all ${
                  !item.is_available ? "opacity-75" : ""
                } ${selectedItems.includes(item.id) ? "ring-2 ring-primary-500" : ""}`}
              >
                <div className="h-2 bg-gradient-to-r from-primary-500 to-primary-600" />

                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => handleSelectItem(item.id)}
                      className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex gap-1">
                      {item.is_signature && (
                        <span
                          className="bg-yellow-100 text-yellow-700 p-1 rounded-full"
                          title="Signature Dish"
                        >
                          <StarIcon className="h-3 w-3" />
                        </span>
                      )}
                      {item.is_special && (
                        <span
                          className="bg-purple-100 text-purple-700 p-1 rounded-full"
                          title="Special"
                        >
                          <SparklesIcon className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-semibold text-gray-800">{item.name}</h3>
                  {item.category_name && (
                    <p className="text-sm text-gray-500 mt-1">
                      {item.category_name}
                    </p>
                  )}

                  {item.description && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.is_vegetarian && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        🌱 Veg
                      </span>
                    )}
                    {item.is_vegan && (
                      <span className="px-2 py-0.5 bg-lime-100 text-lime-700 text-xs rounded-full">
                        🌿 Vegan
                      </span>
                    )}
                    {item.is_spicy && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                        🌶️ Spicy
                      </span>
                    )}
                    {item.is_gluten_free && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        GF
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Price:</span>
                      <span className="font-bold text-primary-600">
                        ₹{item.price}
                      </span>
                    </div>
                    {item.cost > 0 && profit && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">Profit:</span>
                        <span
                          className={
                            profit.margin > 30
                              ? "text-green-600"
                              : "text-yellow-600"
                          }
                        >
                          ₹{profit.profit.toFixed(2)} (
                          {profit.margin.toFixed(0)}%)
                        </span>
                      </div>
                    )}
                  </div>

                  {item.preparation_time > 0 && (
                    <div className="mt-2 flex items-center text-xs text-gray-500">
                      <ClockIcon className="h-3 w-3 mr-1" />
                      Prep: {item.preparation_time} min
                    </div>
                  )}

                  {item.track_inventory && (
                    <div className="mt-2 flex items-center text-xs">
                      <CubeIcon className="h-3 w-3 mr-1 text-gray-500" />
                      <span
                        className={
                          item.stock_quantity < 10
                            ? "text-red-600"
                            : "text-green-600"
                        }
                      >
                        Stock: {item.stock_quantity}
                      </span>
                    </div>
                  )}

                  <div className="mt-4 flex justify-between items-center border-t pt-3">
                    <button
                      onClick={() => handleToggleAvailability(item.id)}
                      className={`flex items-center text-xs ${
                        item.is_available ? "text-green-600" : "text-gray-400"
                      }`}
                    >
                      {item.is_available ? (
                        <>
                          <EyeIcon className="h-3 w-3 mr-1" /> Active
                        </>
                      ) : (
                        <>
                          <EyeSlashIcon className="h-3 w-3 mr-1" /> Hidden
                        </>
                      )}
                    </button>
                    <div className="space-x-2">
                      <button
                        onClick={() => handleEditItem(item)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit item"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setItemToDelete(item);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-800"
                        title="Delete item"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No menu items found. Click "Add Item" to create your first menu
              item.
            </div>
          )}
        </div>
      ) : (
        // List View
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      selectedItems.length === filteredItems.length &&
                      filteredItems.length > 0
                    }
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Item Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => handleSelectItem(item.id)}
                      className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    {item.description && (
                      <div className="text-sm text-gray-500">
                        {item.description.substring(0, 50)}...
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.category_name || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    ₹{item.price}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        item.is_available
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {item.is_available ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 space-x-2">
                    <button
                      onClick={() => handleEditItem(item)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleToggleAvailability(item.id)}
                      className={`${item.is_available ? "text-green-600" : "text-gray-400"} hover:text-opacity-80`}
                    >
                      {item.is_available ? (
                        <EyeIcon className="h-4 w-4" />
                      ) : (
                        <EyeSlashIcon className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full my-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingItem ? "Edit Menu Item" : "Add New Menu Item"}
              </h2>
              <button
                onClick={() => {
                  setShowItemModal(false);
                  setEditingItem(null);
                  resetItemForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Category Name */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={newItem.category_name}
                    onChange={(e) =>
                      setNewItem({ ...newItem, category_name: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Appetizers, Main Course, Beverages"
                  />
                </div>

                {/* Name */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={(e) =>
                      setNewItem({ ...newItem, name: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                    required
                    placeholder="e.g., Grilled Chicken, Margherita Pizza"
                  />
                </div>

                {/* Description */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newItem.description}
                    onChange={(e) =>
                      setNewItem({ ...newItem, description: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                    rows="2"
                    placeholder="Item description..."
                  />
                </div>

                {/* Price and Cost */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newItem.price}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        price: parseFloat(e.target.value),
                      })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newItem.cost}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        cost: parseFloat(e.target.value),
                      })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                    placeholder="For profit calculation"
                  />
                </div>

                {/* Preparation Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prep Time (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newItem.preparation_time}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        preparation_time: parseInt(e.target.value),
                      })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Tax Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={newItem.tax_rate}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        tax_rate: parseFloat(e.target.value),
                      })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Dietary Options */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dietary Options
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newItem.is_vegetarian}
                        onChange={(e) =>
                          setNewItem({
                            ...newItem,
                            is_vegetarian: e.target.checked,
                          })
                        }
                        className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm">Vegetarian</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newItem.is_vegan}
                        onChange={(e) =>
                          setNewItem({ ...newItem, is_vegan: e.target.checked })
                        }
                        className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm">Vegan</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newItem.is_gluten_free}
                        onChange={(e) =>
                          setNewItem({
                            ...newItem,
                            is_gluten_free: e.target.checked,
                          })
                        }
                        className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm">Gluten Free</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newItem.is_spicy}
                        onChange={(e) =>
                          setNewItem({ ...newItem, is_spicy: e.target.checked })
                        }
                        className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm">Spicy</span>
                    </label>
                  </div>
                </div>

                {/* Special Flags */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Flags
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newItem.is_signature}
                        onChange={(e) =>
                          setNewItem({
                            ...newItem,
                            is_signature: e.target.checked,
                          })
                        }
                        className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm">Signature Dish</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newItem.is_special}
                        onChange={(e) =>
                          setNewItem({
                            ...newItem,
                            is_special: e.target.checked,
                          })
                        }
                        className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm">Special/Seasonal</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newItem.discount_allowed}
                        onChange={(e) =>
                          setNewItem({
                            ...newItem,
                            discount_allowed: e.target.checked,
                          })
                        }
                        className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm">Discount Allowed</span>
                    </label>
                  </div>
                </div>

                {/* Inventory Tracking */}
                <div className="col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newItem.track_inventory}
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          track_inventory: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm">
                      Track Inventory for this item
                    </span>
                  </label>
                </div>

                {newItem.track_inventory && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stock Quantity
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={newItem.stock_quantity}
                        onChange={(e) =>
                          setNewItem({
                            ...newItem,
                            stock_quantity: parseInt(e.target.value),
                          })
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
                        min="0"
                        value={newItem.reorder_level}
                        onChange={(e) =>
                          setNewItem({
                            ...newItem,
                            reorder_level: parseInt(e.target.value),
                          })
                        }
                        className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                        placeholder="Alert when stock below"
                      />
                    </div>
                  </>
                )}

                {/* Status */}
                <div className="col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newItem.is_available}
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          is_available: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm">
                      Item is available for ordering
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowItemModal(false);
                    setEditingItem(null);
                    resetItemForm();
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
                    : editingItem
                      ? "Update Item"
                      : "Create Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && itemToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete{" "}
              <span className="font-semibold">{itemToDelete.name}</span>? This
              action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setItemToDelete(null);
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

      {/* Bulk Edit Modal */}
      {showBulkEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">
              Bulk Edit ({selectedItems.length} items)
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Status</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => handleBulkAction("activate")}
                    className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 flex items-center"
                  >
                    <EyeIcon className="h-5 w-5 mr-3 text-green-600" />
                    <div>
                      <span className="font-medium">Activate Items</span>
                      <p className="text-sm text-gray-500">
                        Make all selected items available
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleBulkAction("deactivate")}
                    className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 flex items-center"
                  >
                    <EyeSlashIcon className="h-5 w-5 mr-3 text-gray-600" />
                    <div>
                      <span className="font-medium">Deactivate Items</span>
                      <p className="text-sm text-gray-500">
                        Hide all selected items from menu
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowBulkEditModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Menu;
