import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Provider } from "react-redux";
import { Toaster } from "react-hot-toast";
import { store } from "./store/store";
import { AuthProvider } from "./context/AuthContext";

// Layout
import MainLayout from "./components/Layout/MainLayout";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import TablePOS from "./pages/TablePOS";
import Menu from "./pages/Menu";
import Inventory from "./pages/Inventory";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import StaffManagement from "./pages/StaffManagement";
import CustomerLoyalty from "./pages/CustomerLoyalty";
import Finance from "./pages/Finance";

// Components
import ProtectedRoute from "./components/Common/ProtectedRoute";

function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <Router>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#363636",
                color: "#fff",
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: "#10b981",
                  secondary: "#fff",
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "#fff",
                },
              },
            }}
          />

          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />

              <Route
                path="table-pos"
                element={
                  <ProtectedRoute allowedRoles={[1, 2, 3, 4]}>
                    <TablePOS />
                  </ProtectedRoute>
                }
              />

              <Route
                path="menu"
                element={
                  <ProtectedRoute allowedRoles={[1, 2]}>
                    <Menu />
                  </ProtectedRoute>
                }
              />

              <Route
                path="inventory"
                element={
                  <ProtectedRoute allowedRoles={[1, 2]}>
                    <Inventory />
                  </ProtectedRoute>
                }
              />

              <Route
                path="reports"
                element={
                  <ProtectedRoute allowedRoles={[1, 2]}>
                    <Reports />
                  </ProtectedRoute>
                }
              />

              <Route
                path="users"
                element={
                  <ProtectedRoute allowedRoles={[1]}>
                    <Users />
                  </ProtectedRoute>
                }
              />

              <Route
                path="settings"
                element={
                  <ProtectedRoute allowedRoles={[1, 2]}>
                    <Settings />
                  </ProtectedRoute>
                }
              />

              <Route
                path="staff"
                element={
                  <ProtectedRoute allowedRoles={[1, 2]}>
                    <StaffManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="customers"
                element={
                  <ProtectedRoute allowedRoles={[1, 2, 3]}>
                    <CustomerLoyalty />
                  </ProtectedRoute>
                }
              />

              <Route
                path="finance"
                element={
                  <ProtectedRoute allowedRoles={[1, 2]}>
                    <Finance />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </Provider>
  );
}

export default App;
