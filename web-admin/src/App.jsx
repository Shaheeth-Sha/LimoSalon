import { Routes, Route } from "react-router-dom";
import Login from "./pages/login/login";
import ForgotPassword from "./pages/forgotPassword/forgot";
import checkEmail from "./pages/checkEmail/checkEmail";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/checkEmail" element={<checkEmail />} />
    </Routes>
  );
}