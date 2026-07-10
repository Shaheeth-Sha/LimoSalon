import "./Settings.css";

import { useState } from "react";
import { Link } from "react-router-dom";

import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import LogoutModal from "../../components/LogoutModal";

export default function Settings() {

  const [showLogout, setShowLogout] = useState(false);

  return (

    <div className="dashboard">

      <Sidebar onLogout={() => setShowLogout(true)} />

      <div className="dashboard-main">

        <Navbar title="Settings" />

        <div className="settings-content">

          <div className="settings-container">

            <div
               className="setting-card"
               onClick={() => window.location.href = "/profile-settings"}
           >
              Profile Settings
           </div>

            <div className="setting-card">
              Account Settings
            </div>

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