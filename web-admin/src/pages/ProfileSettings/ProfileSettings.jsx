import "./ProfileSettings.css";

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import LogoutModal from "../../components/LogoutModal";

export default function ProfileSettings() {

  const navigate = useNavigate();

  const [showLogout, setShowLogout] = useState(false);
     const [fullName, setFullName] = useState("");
     const [email, setEmail] = useState("");
     const [phone, setPhone] = useState("");

     const [error, setError] = useState("");

  return (

    <div className="dashboard">

      <Sidebar onLogout={() => setShowLogout(true)} />

      <div className="dashboard-main">

        <Navbar title="Profile Settings" />

        <div className="profile-content">

          <div className="profile-card">

            <h2>Profile Settings</h2>

            <div className="line"></div>

            <div className="profile-icon">

              👤

            </div>

            <h3>Personal Information</h3>

            <label>Full Name</label>

            <input
               type="text"
               placeholder="Full Name"
               value={fullName}
               onChange={(e) => setFullName(e.target.value)}
            />

            <label>Email Address</label>

           <input
                 type="email"
                 placeholder="Email"
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
            />

            <label>Phone Number</label>

            <input
                type="text"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
            />

            {error && (
                 <p className="error-message">
                    {error}
                 </p>
             )}
             
            <div className="btn-group">

              <button
                  className="cancel-btn"
                  onClick={() => {
                      setFullName("");
                      setEmail("");
                      setPhone("");
                   }}
            >
              Cancel
            </button>

              <button
                  className="save-btn"
                  onClick={() => {

             if (
                fullName.trim() === "" ||
                email.trim() === "" ||
                phone.trim() === ""
            ) {
                setError("Please fill in all fields.");
                return;
            }

             setError("");

             navigate("/profile-updated");

            }}
            >
                  Save Changes
             </button>

            </div>

            <button
              className="back-btn"
              onClick={() => navigate("/settings")}
            >
              Back to Settings
            </button>

          </div>

        </div>

      </div>

      <LogoutModal
        show={showLogout}
        onClose={() => setShowLogout(false)}
      />

    </div>

  );

}