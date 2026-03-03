import React, { useState, useEffect } from "react";
import { staffAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import {
  UserPlusIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CalendarIcon,
  ChartBarIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  StarIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";

const StaffManagement = () => {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Selected items
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [selectedPerformance, setSelectedPerformance] = useState(null);

  // UI states
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("staff"); // staff, schedules, performance
  const [selectedStaffForSchedule, setSelectedStaffForSchedule] =
    useState(null);
  const [selectedStaffForPerformance, setSelectedStaffForPerformance] =
    useState(null);

  // Form data
  const [staffForm, setStaffForm] = useState({
    username: "",
    password: "",
    email: "",
    full_name: "",
    phone: "",
    address: "",
    emergency_contact: "",
    emergency_phone: "",
    role_id: 4,
    department_id: "",
    hourly_rate: "",
    employment_type: "full-time",
    hire_date: new Date().toISOString().split("T")[0],
    is_active: true,
  });

  const [scheduleForm, setScheduleForm] = useState({
    user_id: "",
    day_of_week: 1,
    start_time: "09:00",
    end_time: "17:00",
    is_break: false,
  });

  const [performanceForm, setPerformanceForm] = useState({
    user_id: "",
    review_date: new Date().toISOString().split("T")[0],
    rating: 3,
    feedback: "",
    metrics: {
      orders_processed: 0,
      sales_amount: 0,
      customer_rating: 0,
      attendance_percentage: 100,
    },
  });

  // Constants
  const daysOfWeek = [
    { value: 0, label: "Sunday" },
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
  ];

  const defaultDepartments = [
    { id: 1, name: "Management" },
    { id: 2, name: "Kitchen" },
    { id: 3, name: "Service" },
    { id: 4, name: "Bar" },
    { id: 5, name: "Host" },
    { id: 6, name: "Cleaning" },
  ];

  const defaultRoles = [
    { id: 1, name: "Admin" },
    { id: 2, name: "Manager" },
    { id: 3, name: "Cashier" },
    { id: 4, name: "Waiter" },
    { id: 5, name: "Kitchen" },
  ];

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStaff(),
        fetchDepartments(),
        fetchRoles(),
        fetchSchedules(),
        fetchPerformance(),
      ]);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await staffAPI.getStaff();
      setStaff(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch staff:", error);
      toast.error("Failed to load staff data");
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await staffAPI.getDepartments();
      setDepartments(response.data.data || defaultDepartments);
    } catch (error) {
      console.error("Failed to fetch departments:", error);
      setDepartments(defaultDepartments);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await staffAPI.getRoles();
      setRoles(response.data.data || defaultRoles);
    } catch (error) {
      console.error("Failed to fetch roles:", error);
      setRoles(defaultRoles);
    }
  };

  const fetchSchedules = async () => {
    try {
      const response = await staffAPI.getSchedules();
      setSchedules(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch schedules:", error);
    }
  };

  const fetchPerformance = async () => {
    try {
      const response = await staffAPI.getPerformanceReviews();
      setPerformance(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch performance:", error);
    }
  };

  // ==================== STAFF CRUD ====================
  const handleCreateStaff = async (e) => {
    e.preventDefault();

    if (
      !staffForm.username ||
      !staffForm.password ||
      !staffForm.email ||
      !staffForm.full_name
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      const response = await staffAPI.createStaff(staffForm);
      if (response.data.success) {
        toast.success("Staff member added successfully");
        setShowStaffModal(false);
        resetStaffForm();
        fetchStaff();
      }
    } catch (error) {
      console.error("Failed to add staff:", error);
      toast.error(
        error.response?.data?.message || "Failed to add staff member",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return;

    const updateData = { ...staffForm };
    if (!updateData.password) {
      delete updateData.password;
    }

    try {
      setLoading(true);
      const response = await staffAPI.updateStaff(selectedStaff.id, updateData);
      if (response.data.success) {
        toast.success("Staff updated successfully");
        setShowStaffModal(false);
        setSelectedStaff(null);
        resetStaffForm();
        fetchStaff();
      }
    } catch (error) {
      console.error("Failed to update staff:", error);
      toast.error(error.response?.data?.message || "Failed to update staff");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!selectedStaff) return;

    try {
      setLoading(true);
      const response = await staffAPI.deleteStaff(selectedStaff.id);
      if (response.data.success) {
        toast.success("Staff deleted successfully");
        setShowDeleteModal(false);
        setSelectedStaff(null);
        fetchAllData();
      }
    } catch (error) {
      console.error("Failed to delete staff:", error);
      toast.error(error.response?.data?.message || "Failed to delete staff");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await staffAPI.updateStaff(id, { is_active: !currentStatus });
      toast.success(
        `Staff ${!currentStatus ? "activated" : "deactivated"} successfully`,
      );
      fetchStaff();
    } catch (error) {
      console.error("Failed to toggle status:", error);
      toast.error("Failed to update status");
    }
  };

  // ==================== SCHEDULE CRUD ====================
  const handleCreateSchedule = async (e) => {
    e.preventDefault();

    if (!scheduleForm.user_id) {
      toast.error("Please select a staff member");
      return;
    }

    try {
      setLoading(true);
      const response = await staffAPI.createSchedule(scheduleForm);
      if (response.data.success) {
        toast.success("Schedule created successfully");
        setShowScheduleModal(false);
        resetScheduleForm();
        fetchSchedules();
      }
    } catch (error) {
      console.error("Failed to create schedule:", error);
      toast.error(error.response?.data?.message || "Failed to create schedule");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSchedule = async (e) => {
    e.preventDefault();
    if (!selectedSchedule) return;

    try {
      setLoading(true);
      const response = await staffAPI.updateSchedule(
        selectedSchedule.id,
        scheduleForm,
      );
      if (response.data.success) {
        toast.success("Schedule updated successfully");
        setShowScheduleModal(false);
        setSelectedSchedule(null);
        resetScheduleForm();
        fetchSchedules();
      }
    } catch (error) {
      console.error("Failed to update schedule:", error);
      toast.error(error.response?.data?.message || "Failed to update schedule");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm("Are you sure you want to delete this schedule?"))
      return;

    try {
      setLoading(true);
      const response = await staffAPI.deleteSchedule(id);
      if (response.data.success) {
        toast.success("Schedule deleted successfully");
        fetchSchedules();
      }
    } catch (error) {
      console.error("Failed to delete schedule:", error);
      toast.error(error.response?.data?.message || "Failed to delete schedule");
    } finally {
      setLoading(false);
    }
  };

  // ==================== PERFORMANCE CRUD ====================
  const handleCreatePerformance = async (e) => {
    e.preventDefault();

    if (!performanceForm.user_id) {
      toast.error("Please select a staff member");
      return;
    }

    try {
      setLoading(true);
      const response = await staffAPI.createPerformanceReview(performanceForm);
      if (response.data.success) {
        toast.success("Performance review added successfully");
        setShowPerformanceModal(false);
        resetPerformanceForm();
        fetchPerformance();
      }
    } catch (error) {
      console.error("Failed to create review:", error);
      toast.error(error.response?.data?.message || "Failed to create review");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePerformance = async (e) => {
    e.preventDefault();
    if (!selectedPerformance) return;

    try {
      setLoading(true);
      const response = await staffAPI.updatePerformanceReview(
        selectedPerformance.id,
        performanceForm,
      );
      if (response.data.success) {
        toast.success("Performance review updated successfully");
        setShowPerformanceModal(false);
        setSelectedPerformance(null);
        resetPerformanceForm();
        fetchPerformance();
      }
    } catch (error) {
      console.error("Failed to update review:", error);
      toast.error(error.response?.data?.message || "Failed to update review");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePerformance = async (id) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;

    try {
      setLoading(true);
      const response = await staffAPI.deletePerformanceReview(id);
      if (response.data.success) {
        toast.success("Review deleted successfully");
        fetchPerformance();
      }
    } catch (error) {
      console.error("Failed to delete review:", error);
      toast.error(error.response?.data?.message || "Failed to delete review");
    } finally {
      setLoading(false);
    }
  };

  // ==================== UTILITY FUNCTIONS ====================
  const resetStaffForm = () => {
    setStaffForm({
      username: "",
      password: "",
      email: "",
      full_name: "",
      phone: "",
      address: "",
      emergency_contact: "",
      emergency_phone: "",
      role_id: 4,
      department_id: "",
      hourly_rate: "",
      employment_type: "full-time",
      hire_date: new Date().toISOString().split("T")[0],
      is_active: true,
    });
  };

  const resetScheduleForm = () => {
    setScheduleForm({
      user_id: selectedStaffForSchedule?.id || "",
      day_of_week: 1,
      start_time: "09:00",
      end_time: "17:00",
      is_break: false,
    });
  };

  const resetPerformanceForm = () => {
    setPerformanceForm({
      user_id: selectedStaffForPerformance?.id || "",
      review_date: new Date().toISOString().split("T")[0],
      rating: 3,
      feedback: "",
      metrics: {
        orders_processed: 0,
        sales_amount: 0,
        customer_rating: 0,
        attendance_percentage: 100,
      },
    });
  };

  const openEditStaff = (staffMember) => {
    setSelectedStaff(staffMember);
    setStaffForm({
      username: staffMember.username || "",
      password: "",
      email: staffMember.email || "",
      full_name: staffMember.full_name || "",
      phone: staffMember.phone || "",
      address: staffMember.address || "",
      emergency_contact: staffMember.emergency_contact || "",
      emergency_phone: staffMember.emergency_phone || "",
      role_id: staffMember.role_id || 4,
      department_id: staffMember.department_id || "",
      hourly_rate: staffMember.hourly_rate || "",
      employment_type: staffMember.employment_type || "full-time",
      hire_date: staffMember.hire_date
        ? staffMember.hire_date.split("T")[0]
        : new Date().toISOString().split("T")[0],
      is_active: staffMember.is_active !== false,
    });
    setShowStaffModal(true);
  };

  const openAddSchedule = (staffMember) => {
    setSelectedStaffForSchedule(staffMember);
    setSelectedSchedule(null);
    setScheduleForm({
      user_id: staffMember.id,
      day_of_week: 1,
      start_time: "09:00",
      end_time: "17:00",
      is_break: false,
    });
    setShowScheduleModal(true);
  };

  const openEditSchedule = (schedule) => {
    setSelectedSchedule(schedule);
    setScheduleForm({
      user_id: schedule.user_id,
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time.slice(0, 5),
      end_time: schedule.end_time.slice(0, 5),
      is_break: schedule.is_break || false,
    });
    setShowScheduleModal(true);
  };

  const openAddPerformance = (staffMember) => {
    setSelectedStaffForPerformance(staffMember);
    setSelectedPerformance(null);
    setPerformanceForm({
      user_id: staffMember.id,
      review_date: new Date().toISOString().split("T")[0],
      rating: 3,
      feedback: "",
      metrics: {
        orders_processed: 0,
        sales_amount: 0,
        customer_rating: 0,
        attendance_percentage: 100,
      },
    });
    setShowPerformanceModal(true);
  };

  const openEditPerformance = (performance) => {
    setSelectedPerformance(performance);
    setPerformanceForm({
      user_id: performance.user_id,
      review_date: performance.review_date.split("T")[0],
      rating: performance.rating,
      feedback: performance.feedback || "",
      metrics: performance.metrics || {
        orders_processed: 0,
        sales_amount: 0,
        customer_rating: 0,
        attendance_percentage: 100,
      },
    });
    setShowPerformanceModal(true);
  };

  const getStaffName = (userId) => {
    const member = staff.find((s) => s.id === userId);
    return member?.full_name || "Unknown";
  };

  const getRoleName = (roleId) => {
    const role =
      roles.find((r) => r.id === roleId) ||
      defaultRoles.find((r) => r.id === roleId);
    return role?.name || "Unknown";
  };

  const getDepartmentName = (deptId) => {
    const dept =
      departments.find((d) => d.id === deptId) ||
      defaultDepartments.find((d) => d.id === deptId);
    return dept?.name || "Not Assigned";
  };

  const getSchedulesForUser = (userId) => {
    return schedules.filter((s) => s.user_id === userId);
  };

  const getPerformanceForUser = (userId) => {
    return performance.filter((p) => p.user_id === userId);
  };

  const getAverageRating = (userId) => {
    const userPerformance = performance.filter((p) => p.user_id === userId);
    if (userPerformance.length === 0) return 0;
    const sum = userPerformance.reduce((acc, curr) => acc + curr.rating, 0);
    return (sum / userPerformance.length).toFixed(1);
  };

  const filteredStaff = staff.filter(
    (s) =>
      s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone?.includes(searchTerm) ||
      s.username?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading && !staff.length) {
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
          <h1 className="text-2xl font-bold text-gray-800">Staff Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            {staff.length} total staff •{" "}
            {staff.filter((s) => s.is_active).length} active
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedStaff(null);
            resetStaffForm();
            setShowStaffModal(true);
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center"
        >
          <UserPlusIcon className="h-5 w-5 mr-2" />
          Add Staff
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("staff")}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === "staff"
                ? "border-b-2 border-primary-600 text-primary-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <UserGroupIcon className="h-4 w-4 inline mr-2" />
            Staff List
          </button>
          <button
            onClick={() => setActiveTab("schedules")}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === "schedules"
                ? "border-b-2 border-primary-600 text-primary-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <CalendarIcon className="h-4 w-4 inline mr-2" />
            Schedules
          </button>
          <button
            onClick={() => setActiveTab("performance")}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === "performance"
                ? "border-b-2 border-primary-600 text-primary-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <ChartBarIcon className="h-4 w-4 inline mr-2" />
            Performance
          </button>
        </div>

        {/* ==================== STAFF LIST TAB ==================== */}
        {activeTab === "staff" && (
          <>
            <div className="p-4 border-b">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search staff by name, email, username or phone..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStaff.map((member) => (
                  <div
                    key={member.id}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold text-lg mr-3">
                          {member.full_name?.charAt(0) || "S"}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-800">
                            {member.full_name}
                          </h3>
                          <p className="text-xs text-gray-500">
                            @{member.username}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => openEditStaff(member)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStaff(member);
                            setShowDeleteModal(true);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Role:</span>
                        <span className="font-medium text-gray-700">
                          {getRoleName(member.role_id)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Department:</span>
                        <span className="font-medium text-gray-700">
                          {getDepartmentName(member.department_id)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Email:</span>
                        <span className="font-medium text-gray-700">
                          {member.email}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Phone:</span>
                        <span className="font-medium text-gray-700">
                          {member.phone || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Hourly Rate:</span>
                        <span className="font-medium text-green-600">
                          ₹{member.hourly_rate || 0}/hr
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status:</span>
                        <button
                          onClick={() =>
                            handleToggleStatus(member.id, member.is_active)
                          }
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            member.is_active
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {member.is_active ? "Active" : "Inactive"}
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2">
                      <button
                        onClick={() => openAddSchedule(member)}
                        className="text-xs bg-blue-50 text-blue-600 py-2 rounded hover:bg-blue-100 flex items-center justify-center"
                      >
                        <ClockIcon className="h-3 w-3 mr-1" />
                        Add Schedule
                      </button>
                      <button
                        onClick={() => openAddPerformance(member)}
                        className="text-xs bg-green-50 text-green-600 py-2 rounded hover:bg-green-100 flex items-center justify-center"
                      >
                        <StarIcon className="h-3 w-3 mr-1" />
                        Add Review
                      </button>
                    </div>

                    <div className="mt-2 flex justify-between text-xs text-gray-500">
                      <span>
                        Schedules: {getSchedulesForUser(member.id).length}
                      </span>
                      <span>
                        Reviews: {getPerformanceForUser(member.id).length}
                      </span>
                      <span>Rating: ⭐ {getAverageRating(member.id)}</span>
                    </div>
                  </div>
                ))}

                {filteredStaff.length === 0 && (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    No staff members found matching your search.
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ==================== SCHEDULES TAB ==================== */}
        {activeTab === "schedules" && (
          <div className="p-4">
            <div className="mb-4 flex justify-between items-center">
              <h3 className="font-semibold text-gray-700">Staff Schedules</h3>
              <select
                onChange={(e) => {
                  const staffId = e.target.value;
                  if (staffId) {
                    const member = staff.find(
                      (s) => s.id === parseInt(staffId),
                    );
                    if (member) openAddSchedule(member);
                  }
                }}
                className="border rounded-lg px-3 py-1.5 text-sm"
                value=""
              >
                <option value="">Add schedule for...</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {daysOfWeek.map((day) => (
                <div
                  key={day.value}
                  className="bg-gray-50 rounded-lg p-3 min-h-[500px]"
                >
                  <h4 className="font-medium text-sm text-gray-700 mb-3 text-center">
                    {day.label}
                  </h4>
                  <div className="space-y-2">
                    {schedules
                      .filter((s) => s.day_of_week === day.value)
                      .map((schedule) => {
                        const staffMember = staff.find(
                          (s) => s.id === schedule.user_id,
                        );
                        return (
                          <div
                            key={schedule.id}
                            className="bg-white p-2 rounded border border-gray-200 text-xs hover:shadow-md transition-shadow group relative"
                          >
                            <div className="font-medium text-gray-800">
                              {staffMember?.full_name || "Unknown"}
                            </div>
                            <div className="text-gray-500 flex items-center mt-1">
                              <ClockIcon className="h-3 w-3 mr-1" />
                              {schedule.start_time.slice(0, 5)} -{" "}
                              {schedule.end_time.slice(0, 5)}
                            </div>
                            {schedule.is_break && (
                              <span className="absolute top-1 right-1 text-[10px] bg-yellow-100 text-yellow-700 px-1 rounded">
                                Break
                              </span>
                            )}
                            <div className="absolute top-1 right-1 hidden group-hover:flex space-x-1">
                              <button
                                onClick={() => openEditSchedule(schedule)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              >
                                <PencilIcon className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteSchedule(schedule.id)
                                }
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                              >
                                <TrashIcon className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== PERFORMANCE TAB ==================== */}
        {activeTab === "performance" && (
          <div className="p-4">
            <div className="mb-4 flex justify-between items-center">
              <h3 className="font-semibold text-gray-700">
                Performance Reviews
              </h3>
              <select
                onChange={(e) => {
                  const staffId = e.target.value;
                  if (staffId) {
                    const member = staff.find(
                      (s) => s.id === parseInt(staffId),
                    );
                    if (member) openAddPerformance(member);
                  }
                }}
                className="border rounded-lg px-3 py-1.5 text-sm"
                value=""
              >
                <option value="">Add review for...</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              {staff.map((member) => {
                const memberPerformance = performance.filter(
                  (p) => p.user_id === member.id,
                );
                if (memberPerformance.length === 0) return null;

                return (
                  <div key={member.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-800">
                        {member.full_name}
                      </h4>
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className="text-yellow-400">
                            {star <= (memberPerformance[0]?.rating || 0)
                              ? "★"
                              : "☆"}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {memberPerformance.map((review) => (
                        <div
                          key={review.id}
                          className="bg-white p-3 rounded border border-gray-200"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-xs text-gray-500">
                                {new Date(
                                  review.review_date,
                                ).toLocaleDateString()}
                              </p>
                              <p className="text-sm mt-1">
                                {review.feedback || "No feedback provided"}
                              </p>
                            </div>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => openEditPerformance(review)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              >
                                <PencilIcon className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() =>
                                  handleDeletePerformance(review.id)
                                }
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                              >
                                <TrashIcon className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          {review.metrics && (
                            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t text-xs">
                              <div>
                                <span className="text-gray-500">Orders:</span>
                                <span className="ml-1 font-medium">
                                  {review.metrics.orders_processed || 0}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Sales:</span>
                                <span className="ml-1 font-medium">
                                  ₹{review.metrics.sales_amount || 0}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">
                                  Customer Rating:
                                </span>
                                <span className="ml-1 font-medium">
                                  {review.metrics.customer_rating || 0}/5
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">
                                  Attendance:
                                </span>
                                <span className="ml-1 font-medium">
                                  {review.metrics.attendance_percentage || 100}%
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {performance.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <ChartBarIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <p>No performance reviews yet</p>
                  <p className="text-sm mt-2">
                    Add a review for a staff member to get started
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ==================== STAFF MODAL ==================== */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full my-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {selectedStaff ? "Edit Staff" : "Add New Staff"}
              </h2>
              <button
                onClick={() => {
                  setShowStaffModal(false);
                  setSelectedStaff(null);
                  resetStaffForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form
              onSubmit={selectedStaff ? handleUpdateStaff : handleCreateStaff}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={staffForm.username}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, username: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                    required
                    disabled={!!selectedStaff}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {selectedStaff ? "New Password (optional)" : "Password *"}
                  </label>
                  <input
                    type="password"
                    value={staffForm.password}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, password: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                    required={!selectedStaff}
                    minLength="6"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={staffForm.full_name}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, full_name: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={staffForm.email}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, email: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={staffForm.phone}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, phone: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={staffForm.role_id}
                    onChange={(e) =>
                      setStaffForm({
                        ...staffForm,
                        role_id: parseInt(e.target.value),
                      })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  >
                    {defaultRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <select
                    value={staffForm.department_id}
                    onChange={(e) =>
                      setStaffForm({
                        ...staffForm,
                        department_id: parseInt(e.target.value),
                      })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Department</option>
                    {defaultDepartments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hourly Rate (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={staffForm.hourly_rate}
                    onChange={(e) =>
                      setStaffForm({
                        ...staffForm,
                        hourly_rate: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employment Type
                  </label>
                  <select
                    value={staffForm.employment_type}
                    onChange={(e) =>
                      setStaffForm({
                        ...staffForm,
                        employment_type: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="full-time">Full Time</option>
                    <option value="part-time">Part Time</option>
                    <option value="contract">Contract</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hire Date
                  </label>
                  <input
                    type="date"
                    value={staffForm.hire_date}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, hire_date: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Contact
                  </label>
                  <input
                    type="text"
                    value={staffForm.emergency_contact}
                    onChange={(e) =>
                      setStaffForm({
                        ...staffForm,
                        emergency_contact: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Phone
                  </label>
                  <input
                    type="tel"
                    value={staffForm.emergency_phone}
                    onChange={(e) =>
                      setStaffForm({
                        ...staffForm,
                        emergency_phone: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    value={staffForm.address}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, address: e.target.value })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                    rows="2"
                  />
                </div>

                <div className="col-span-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={staffForm.is_active}
                      onChange={(e) =>
                        setStaffForm({
                          ...staffForm,
                          is_active: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowStaffModal(false);
                    setSelectedStaff(null);
                    resetStaffForm();
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
                    : selectedStaff
                      ? "Update Staff"
                      : "Add Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== SCHEDULE MODAL ==================== */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {selectedSchedule ? "Edit Schedule" : "Add Schedule"}
              </h2>
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setSelectedSchedule(null);
                  setSelectedStaffForSchedule(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Staff:{" "}
              <span className="font-medium">
                {getStaffName(scheduleForm.user_id)}
              </span>
            </p>

            <form
              onSubmit={
                selectedSchedule ? handleUpdateSchedule : handleCreateSchedule
              }
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Day of Week *
                  </label>
                  <select
                    value={scheduleForm.day_of_week}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        day_of_week: parseInt(e.target.value),
                      })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    {daysOfWeek.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      value={scheduleForm.start_time}
                      onChange={(e) =>
                        setScheduleForm({
                          ...scheduleForm,
                          start_time: e.target.value,
                        })
                      }
                      className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time *
                    </label>
                    <input
                      type="time"
                      value={scheduleForm.end_time}
                      onChange={(e) =>
                        setScheduleForm({
                          ...scheduleForm,
                          end_time: e.target.value,
                        })
                      }
                      className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_break"
                    checked={scheduleForm.is_break}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        is_break: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <label
                    htmlFor="is_break"
                    className="ml-2 text-sm text-gray-700"
                  >
                    This is a break schedule
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduleModal(false);
                    setSelectedSchedule(null);
                    setSelectedStaffForSchedule(null);
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
                    : selectedSchedule
                      ? "Update Schedule"
                      : "Add Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== PERFORMANCE MODAL ==================== */}
      {showPerformanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full my-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {selectedPerformance
                  ? "Edit Performance Review"
                  : "Add Performance Review"}
              </h2>
              <button
                onClick={() => {
                  setShowPerformanceModal(false);
                  setSelectedPerformance(null);
                  setSelectedStaffForPerformance(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Staff:{" "}
              <span className="font-medium">
                {getStaffName(performanceForm.user_id)}
              </span>
            </p>

            <form
              onSubmit={
                selectedPerformance
                  ? handleUpdatePerformance
                  : handleCreatePerformance
              }
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Review Date *
                  </label>
                  <input
                    type="date"
                    value={performanceForm.review_date}
                    onChange={(e) =>
                      setPerformanceForm({
                        ...performanceForm,
                        review_date: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rating *
                  </label>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() =>
                          setPerformanceForm({
                            ...performanceForm,
                            rating: star,
                          })
                        }
                        className="focus:outline-none"
                      >
                        {star <= performanceForm.rating ? (
                          <StarIconSolid className="h-8 w-8 text-yellow-400" />
                        ) : (
                          <StarIcon className="h-8 w-8 text-gray-300" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Feedback
                  </label>
                  <textarea
                    value={performanceForm.feedback}
                    onChange={(e) =>
                      setPerformanceForm({
                        ...performanceForm,
                        feedback: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                    rows="3"
                    placeholder="Enter feedback about the staff member's performance..."
                  />
                </div>

                <div className="col-span-2">
                  <h4 className="font-medium text-sm text-gray-700 mb-2">
                    Performance Metrics
                  </h4>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Orders Processed
                  </label>
                  <input
                    type="number"
                    value={performanceForm.metrics.orders_processed}
                    onChange={(e) =>
                      setPerformanceForm({
                        ...performanceForm,
                        metrics: {
                          ...performanceForm.metrics,
                          orders_processed: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sales Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={performanceForm.metrics.sales_amount}
                    onChange={(e) =>
                      setPerformanceForm({
                        ...performanceForm,
                        metrics: {
                          ...performanceForm.metrics,
                          sales_amount: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Rating (1-5)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={performanceForm.metrics.customer_rating}
                    onChange={(e) =>
                      setPerformanceForm({
                        ...performanceForm,
                        metrics: {
                          ...performanceForm.metrics,
                          customer_rating: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Attendance Percentage
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={performanceForm.metrics.attendance_percentage}
                    onChange={(e) =>
                      setPerformanceForm({
                        ...performanceForm,
                        metrics: {
                          ...performanceForm.metrics,
                          attendance_percentage:
                            parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowPerformanceModal(false);
                    setSelectedPerformance(null);
                    setSelectedStaffForPerformance(null);
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
                    : selectedPerformance
                      ? "Update Review"
                      : "Add Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Delete Staff Member</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete{" "}
              <span className="font-semibold">{selectedStaff.full_name}</span>?
              This will also delete all their schedules and performance reviews.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedStaff(null);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStaff}
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

export default StaffManagement;
