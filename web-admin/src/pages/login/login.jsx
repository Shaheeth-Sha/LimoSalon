import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./login.css";

import logo from "../../assets/logo.png";
import loginImage from "../../assets/login.png";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    // API එක connect කරනකන් temporary navigation
    navigate("/dashboard");
  };

  return (
    <div className="login-page">
      <div className="left-side">
        <img src={loginImage} alt="Login" />
      </div>

      <div className="right-side">
        <div className="login-card">

          <div className="logo-section">
            <img src={logo} alt="Logo" />
            <h2>LIMO<br />SALON</h2>
          </div>

          <h1>ADMIN LOGIN</h1>

          <form onSubmit={handleLogin}>

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <p
              className="forgot"
              onClick={() => navigate("/forgot-password")}
            >
              Forgot password?
            </p>

            <button type="submit">
              Log In
            </button>

          </form>

        </div>
      </div>
    </div>
  );
}