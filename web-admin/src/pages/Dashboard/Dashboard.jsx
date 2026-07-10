import "./Dashboard.css";
import { useNavigate } from "react-router-dom";

import { useState } from "react";


import LogoutModal from "../../components/LogoutModal";

import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import StatCard from "../../components/StatCard";

import graph from "../../assets/graph.png";

export default function Dashboard() {

  const [showLogout, setShowLogout] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="dashboard">

      <Sidebar onLogout={() => setShowLogout(true)} />

      <div className="dashboard-main">

        <Navbar title="Dashboard" />

        <div className="dashboard-content">

          <h1>WELCOME!</h1>

          <p className="subtitle">
            See what's today
          </p>

          <div className="card-container">

            <StatCard
              title="Total Appointments"
              value="125"
            />

            <StatCard
              title="Revenue"
              value="LKR 25,000"
            />

            <StatCard
              title="Active Staff"
              value="5"
            />

          </div>

          <div className="graph-box">
            <img src={graph} alt="Graph" />
          </div>

        </div>

      </div>

      {showLogout && (

        <div className="logout-overlay">

          <div className="logout-modal">

            <h2>Are you sure you want to logout?</h2>

            <div className="logout-buttons">

              <button
                className="no-btn"
                onClick={() => setShowLogout(false)}
              >
                No
              </button>

              <button
                className="yes-btn"
                onClick={() => navigate("/")}
              >
                Yes, Logout
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}