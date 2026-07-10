import "./Services.css";

import { useState } from "react";

import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import LogoutModal from "../../components/LogoutModal";

export default function Services() {

  const [showLogout, setShowLogout] = useState(false);

  return (
    <div className="dashboard">

      <Sidebar onLogout={() => setShowLogout(true)} />

      <div className="dashboard-main">

        <Navbar title="Services" />

        <div className="services-content">

          <h1>Services</h1>

          <button className="add-btn">
            + Add Service
          </button>

          <table className="service-table">

            <thead>
              <tr>
                <th>Service</th>
                <th>Duration</th>
                <th>Price</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>

              <tr>
                <td>Hair Cut</td>
                <td>30 min</td>
                <td>LKR 1500</td>
                <td>
                  <button className="edit-btn">Edit</button>
                  <button className="delete-btn">Delete</button>
                </td>
              </tr>

              <tr>
                <td>Hair Colour</td>
                <td>90 min</td>
                <td>LKR 4500</td>
                <td>
                  <button className="edit-btn">Edit</button>
                  <button className="delete-btn">Delete</button>
                </td>
              </tr>

              <tr>
                <td>Facial</td>
                <td>60 min</td>
                <td>LKR 3000</td>
                <td>
                  <button className="edit-btn">Edit</button>
                  <button className="delete-btn">Delete</button>
                </td>
              </tr>

            </tbody>

          </table>

        </div>

      </div>

      <LogoutModal
        show={showLogout}
        onClose={() => setShowLogout(false)}
      />

    </div>
  );
}