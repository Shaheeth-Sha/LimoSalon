import { Routes, Route } from "react-router-dom";
import Login from "./pages/login/login";
import ForgotPassword from "./pages/forgotPassword/forgot";
import CheckEmail from "./pages/checkEmail/checkEmail";
import Dashboard from "./pages/Dashboard/Dashboard";
import Services from "./pages/Services/Services";
import Staff from "./pages/Staff/Staff";
import Reports from "./pages/Reports/Reports";
import Settings from "./pages/Settings/Settings";
import Logout from "./pages/Logout/Logout";
import ProfileSettings from "./pages/ProfileSettings/ProfileSettings";
import ProfileUpdated from "./pages/ProfileUpdated/ProfileUpdated";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/checkEmail" element={<CheckEmail />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/services" element={<Services />} />
      <Route path="/staff" element={<Staff />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/logout" element={<Logout />} />
      <Route path="/profile-settings" element={<ProfileSettings />} />
      <Route path="/profile-updated" element={<ProfileUpdated />} />
    </Routes>
  );
}