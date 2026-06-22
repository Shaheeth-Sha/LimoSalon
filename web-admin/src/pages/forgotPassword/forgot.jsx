import React from "react";
import "./forgot.css";
import image from "../../assets/forgot.png"; // change name if needed
import { useNavigate } from "react-router-dom";
  
const ForgotPassword = () => {
  const navigate = useNavigate();

  return (
    <div className="container">

      {/* LEFT SIDE */}
      <div className="left">
        <img src={image} alt="forgot" className="illustration" />
      </div>

      {/* RIGHT SIDE */}
      <div className="right">

        <div className="card">

          <h1 className="title">FORGOT PASSWORD</h1>

          <p className="subtitle">
            Enter your E-mail address and we will send you a reset link
          </p>

          <input
            type="email"
            placeholder="Email"
            className="input"
          />

          <button className="btn"
          onClick={(e) => {e.preventDefault(); navigate("/checkEmail")}}>
            Send Reset Link
          </button>

          <p className="back">Back to Login</p>

        </div>

      </div>

    </div>
  );
};

export default ForgotPassword;