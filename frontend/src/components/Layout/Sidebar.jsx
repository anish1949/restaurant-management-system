import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  HomeIcon,
  TableCellsIcon,
  Squares2X2Icon,
  CubeIcon,
  UsersIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
} from "@heroicons/react/24/outline";

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, logout } = useAuth();

  const navigation = [
    { name: "Dashboard", href: "/", icon: HomeIcon, roles: [1, 2, 3, 4, 5] },
    {
      name: "Table POS",
      href: "/table-pos",
      icon: TableCellsIcon,
      roles: [1, 2, 3, 4],
    },
    { name: "Menu", href: "/menu", icon: Squares2X2Icon, roles: [1, 2] },
    { name: "Inventory", href: "/inventory", icon: CubeIcon, roles: [1, 2] },
    { name: "Staff", href: "/staff", icon: UsersIcon, roles: [1, 2] },
    {
      name: "Customers",
      href: "/customers",
      icon: UserGroupIcon,
      roles: [1, 2, 3],
    },
    {
      name: "Finance",
      href: "/finance",
      icon: CurrencyDollarIcon,
      roles: [1, 2],
    },
    { name: "Reports", href: "/reports", icon: ChartBarIcon, roles: [1, 2] },
    { name: "Settings", href: "/settings", icon: Cog6ToothIcon, roles: [1, 2] },
  ];

  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(user?.role_id),
  );

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-gray-900 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-center h-16 bg-gray-800">
          <span className="text-white text-xl font-bold">RMS Pro</span>
        </div>

        <nav className="mt-5 flex-1 px-2 space-y-1">
          {filteredNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  isActive
                    ? "bg-gray-800 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`
              }
            >
              <item.icon className="mr-3 h-6 w-6" aria-hidden="true" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-4">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold">
                {user?.full_name?.charAt(0) || "U"}
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">
                {user?.full_name || "User"}
              </p>
              <p className="text-xs font-medium text-gray-400">
                {user?.role_name || "Staff"}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center px-2 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-700 hover:text-white"
          >
            <ArrowLeftOnRectangleIcon className="mr-3 h-6 w-6" />
            Logout
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
