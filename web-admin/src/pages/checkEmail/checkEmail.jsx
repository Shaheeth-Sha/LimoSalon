import React from "react";
import "./checkEmail.css";
import image from "../../assets/checkEmail.png";


const CheckEmail = () => {
  return (
    <div className="container">

      {/* LEFT SIDE */}
      <div className="left">
        <img src={image} alt="check email" className="illustration" />
      </div>

      {/* RIGHT SIDE */}
      <div className="right">

        <div className="card">

          <h1 className="title">CHECK YOUR E-MAIL</h1>

          <div className="messageBox">
            <p>
              A password reset link has been sent to your email address.
              Please check your inbox.
            </p>
          </div>

          <button className="btn">
            Back to Login
          </button>

        </div>

      </div>

    </div>
  );
};

export default CheckEmail;