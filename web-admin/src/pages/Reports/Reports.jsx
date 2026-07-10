import "./Reports.css";

import { useState } from "react";

import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import LogoutModal from "../../components/LogoutModal";

export default function Reports() {

  const [showLogout, setShowLogout] = useState(false);

  return (
    <div className="dashboard">

      <Sidebar onLogout={() => setShowLogout(true)} />

      <div className="dashboard-main">

        <Navbar title="Reports" />

        <div className="reports-content">

          <div className="reports-header">
            <h1>Reports</h1>
          </div>

          <div className="date-range-card">

            <label>Select Date Range</label>

            <div className="date-inputs">

              <input placeholder="DD" />
              <input placeholder="MM" />
              <input placeholder="YYYY" />

              <span>to</span>

              <input placeholder="DD" />
              <input placeholder="MM" />
              <input placeholder="YYYY" />

            </div>

          </div>

          <div className="report-cards">

            <div className="report-card">

              <h3>Appointment Summary</h3>

              <p>
                View appointments by date,
                customer and service.
              </p>

              <button>View Report</button>

            </div>

            <div className="report-card">

              <h3>Revenue Summary</h3>

              <p>
                View revenue by
                date and services.
              </p>

              <button>View Report</button>

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