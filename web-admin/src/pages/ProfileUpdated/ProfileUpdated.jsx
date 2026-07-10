import "./ProfileUpdated.css";

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import LogoutModal from "../../components/LogoutModal";

export default function ProfileUpdated() {
  const navigate = useNavigate();

  const [showLogout, setShowLogout] = useState(false);

  return (
    <div className="dashboard">
      <Sidebar onLogout={() => setShowLogout(true)} />

      <div className="dashboard-main">
        <Navbar title="Profile Updated" />

        <div className="updated-content">

          <div className="updated-card">

            <div className="success-circle">
              ✓
            </div>

            <h2>Profile Updated</h2>

            <p>
              Your profile information has been
              <br />
              updated successfully.
            </p>

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