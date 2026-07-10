export default function Navbar({ title }) {
  return (
    <div className="navbar">
      <h2>{title}</h2>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <img
          src="https://cdn-icons-png.flaticon.com/512/1077/1077114.png"
          width="38"
          alt="Admin"
        />

        <p>Admin</p>
      </div>
    </div>
  );
}