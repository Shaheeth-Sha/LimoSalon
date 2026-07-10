import { useNavigate } from "react-router-dom";

export default function LogoutModal({ show, onClose }) {
  const navigate = useNavigate();

  if (!show) return null;

  return (
    <div className="logout-overlay">
      <div className="logout-modal">
        <h2>Are you sure you want to logout?</h2>

        <div className="logout-buttons">
          <button className="no-btn" onClick={onClose}>
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
  );
}