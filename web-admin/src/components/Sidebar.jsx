import { NavLink } from "react-router-dom";
import logo from "../assets/logo.png";

export default function Sidebar({ onLogout }) {
  return (
    <div className="sidebar">
      <div>
        <div className="logo">
          <img src={logo} alt="Logo" />

          <div>
            <h2>LIMO</h2>
            <h2>SALON</h2>
          </div>
        </div>

        <ul>

<li>
<NavLink
to="/dashboard"
className={({isActive})=>isActive?"active":""}
>
Dashboard
</NavLink>
</li>

<li>
<NavLink
to="/services"
className={({isActive})=>isActive?"active":""}
>
Services
</NavLink>
</li>

<li>
<NavLink
to="/staff"
className={({isActive})=>isActive?"active":""}
>
Staff
</NavLink>
</li>

<li>
<NavLink
to="/reports"
className={({isActive})=>isActive?"active":""}
>
Reports
</NavLink>
</li>

<li>
<NavLink
to="/settings"
className={({isActive})=>isActive?"active":""}
>
Settings
</NavLink>
</li>

</ul>
      </div>

      <button
  className="logout-btn"
  onClick={onLogout}
>
  Log out
</button>
    </div>
  );
}