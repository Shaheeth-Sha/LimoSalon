import "./Staff.css";

import { useState } from "react";

import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import LogoutModal from "../../components/LogoutModal";

export default function Staff() {

  const [showLogout, setShowLogout] = useState(false);

  return (
    <div className="dashboard">

      <Sidebar onLogout={() => setShowLogout(true)} />

      <div className="dashboard-main">

        <Navbar title="Staff" />

        <div className="staff-content">

          <div className="staff-header">
            <h1>Staff</h1>

            <button className="add-btn">
              + Add Staff
            </button>
          </div>

          <table className="staff-table">

            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>

  <tr>
    <td>Nimal Perera</td>
    <td>Hair Stylist</td>
    <td>0771234567</td>
    <td><span className="status active">Active</span></td>
    <td>
      <button className="edit-btn">Edit</button>
      <button className="delete-btn">Delete</button>
    </td>
  </tr>

  <tr>
    <td>Kavindi Silva</td>
    <td>Beautician</td>
    <td>0714567890</td>
    <td><span className="status active">Active</span></td>
    <td>
      <button className="edit-btn">Edit</button>
      <button className="delete-btn">Delete</button>
    </td>
  </tr>

  <tr>
    <td>Sanduni Fernando</td>
    <td>Makeup Artist</td>
    <td>0759876543</td>
    <td><span className="status inactive">Inactive</span></td>
    <td>
      <button className="edit-btn">Edit</button>
      <button className="delete-btn">Delete</button>
    </td>
  </tr>

  <tr>
    <td>Kasun Jayasinghe</td>
    <td>Receptionist</td>
    <td>0763456789</td>
    <td><span className="status active">Active</span></td>
    <td>
      <button className="edit-btn">Edit</button>
      <button className="delete-btn">Delete</button>
    </td>
  </tr>

  <tr>
    <td>Tharushi Perera</td>
    <td>Nail Technician</td>
    <td>0787654321</td>
    <td><span className="status active">Active</span></td>
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