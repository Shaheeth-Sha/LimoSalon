import "./Logout.css";
import { useNavigate } from "react-router-dom";

import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";

export default function Logout() {
  const navigate = useNavigate();

  return (
    <div className="dashboard">
      <Sidebar />

      <div className="dashboard-main">
        <Navbar title="Dashboard" />

        <div className="logout-overlay">

          <div className="logout-modal">

            <h3>Are you sure you want to logout?</h3>

            <div className="logout-buttons">

              <button
                className="no-btn"
                onClick={() => navigate("/dashboard")}
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

      </div>
    </div>
  );
}