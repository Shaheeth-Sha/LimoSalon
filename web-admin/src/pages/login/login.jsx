import React from "react";
import "./login.css";
import logo from "../../assets/logo.png";
import image from "../../assets/login.png";
import{useNavigate} from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();

  return (
    <div className="container">

      {/* LEFT SIDE */}
      <div className="left">
        <img src={image} alt="login visual" className="illustration" />
      </div>

      {/* RIGHT SIDE */}
      <div className="right">
        <div className="card">

          <div className="logoBox">
            <img src={logo} alt="logo" className="logo" />
            <div className="brandText">
              <span>LIMO </span>
              <span>SALON</span>
            </div>

          </div>

          <h1 className="title">ADMIN LOGIN</h1>

          <input type="email" placeholder="Email" className="input" />
          <input type="password" placeholder="Password" className="input" />

          <p className="forgot" onClick={() => navigate("/forgot-password")} 
            style={{ cursor: "pointer" }}> Forgot Password?
          </p>

          <button className="btn">Log In</button>

        </div>
      </div>

    </div>
  );
};

export default Login;