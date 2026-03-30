  import { useEffect, useState } from "react";
  import API from "../services/api";
  import { API_ENDPOINTS } from "../services/endpoints";
  import Layout from "../components/Layout";
  import {
    Users, Trash2, ShieldCheck, UserPlus, Mail, Phone, Lock, Fingerprint, Settings2, Plus, X, Check, ChevronDown, ChevronUp, Pencil, Undo2, Ban, Save
  } from "lucide-react";
  import toast, { Toaster } from "react-hot-toast";

  const MODULES = [
    { key: "medicine", label: "Medicines", color: "#0369a1", bg: "#e0f2fe", permissions: { create: "can_add_medicine", read: "can_view_medicine", update: "can_edit_medicine", delete: "can_delete_medicine" } },
    { key: "sales", label: "Sales / Billing", color: "#15803d", bg: "#dcfce7", permissions: { create: "can_create_bill", read: "can_view_sales", update: "can_edit_bill", delete: "can_delete_bill" } },
    { key: "reports", label: "Reports & GST", color: "#7c3aed", bg: "#ede9fe", permissions: { create: "can_generate_reports", read: "can_view_reports", update: "can_edit_reports", delete: "can_delete_reports" } },
    { key: "purchase", label: "Purchases", color: "#b45309", bg: "#fef3c7", permissions: { create: "can_add_purchase", read: "can_view_purchases", update: "can_edit_purchase", delete: "can_delete_purchase" } },
  ];

  const DEFAULT_PERMS = {
    can_view_medicine: true, can_add_medicine: false, can_edit_medicine: false, can_delete_medicine: false,
    can_view_sales: true, can_create_bill: true, can_edit_bill: false, can_delete_bill: false,
    can_view_reports: false, can_generate_reports: false, can_edit_reports: false, can_delete_reports: false,
    can_view_purchases: false, can_add_purchase: false, can_edit_purchase: false, can_delete_purchase: false,
  };

  function CrudCell({ allowed, field, roleForm, setRoleForm, readOnly }) {
    if (!field) return <td style={{ textAlign: "center", color: "#cbd5e1" }}>—</td>;
    const on = roleForm[field];
    const toggle = () => { if (!readOnly) setRoleForm((prev) => ({ ...prev, [field]: !prev[field] })); };
    return (
      <td style={{ textAlign: "center" }}>
        <button type="button" onClick={toggle} title={readOnly ? "Not applicable" : on ? "Click to deny" : "Click to allow"}
          style={{
            width: "32px", height: "32px", borderRadius: "8px", border: `2px solid ${on ? "#10b981" : "#e2e8f0"}`,
            background: on ? "#ecfdf5" : "#f8fafc", color: on ? "#10b981" : "#cbd5e1",
            cursor: readOnly ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>
          {on ? <Check size={16} /> : <X size={16} />}
        </button>
      </td>
    );
  }

  function RoleCard({ role, onDelete }) {
    const [expanded, setExpanded] = useState(false);
    const granted = [];
    MODULES.forEach((m) => { ["create", "read", "update", "delete"].forEach((action) => { const field = m.permissions[action]; if (field && role[field]) granted.push({ module: m.label, action, color: m.color, bg: m.bg }); }); });

    return (
      <div className="card" style={{ padding: "1.25rem", borderRadius: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Settings2 size={18} style={{ color: "var(--primary)" }} />
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "800" }}>{role.name}</h3>
            </div>
            {role.description && <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "4px 0 0 26px" }}>{role.description}</p>}
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button onClick={() => setExpanded(!expanded)} style={{ background: "#f1f5f9", border: "none", borderRadius: "8px", padding: "4px 8px", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.78rem", fontWeight: "600" }}>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {expanded ? "Hide" : "View"} Perms
            </button>
            <button onClick={() => onDelete(role.id)} style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "4px 8px", cursor: "pointer", color: "#dc2626", display: "flex", alignItems: "center" }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "0.85rem" }}>
          {granted.length === 0 ? <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>No permissions granted</span> : granted.slice(0, expanded ? undefined : 4).map((g, i) => <span key={i} style={{ fontSize: "0.73rem", background: g.bg, color: g.color, padding: "2px 8px", borderRadius: "10px", fontWeight: "600" }}>{g.action.charAt(0).toUpperCase() + g.action.slice(1)} {g.module}</span>)}
          {!expanded && granted.length > 4 && <span style={{ fontSize: "0.73rem", color: "var(--text-muted)" }}>+{granted.length - 4} more</span>}
        </div>
        {expanded && (
          <div style={{ marginTop: "1rem", borderTop: "1px solid #f1f5f9", paddingTop: "1rem", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <thead><tr><th style={{ textAlign: "left", padding: "4px 8px" }}>Module</th>{["Create", "Read", "Update", "Delete"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {MODULES.map((mod) => (
                  <tr key={mod.key} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td style={{ padding: "4px 8px", fontWeight: "600" }}><span style={{ color: mod.color }}>{mod.label}</span></td>
                    {["create", "read", "update", "delete"].map((action) => {
                      const field = mod.permissions[action];
                      if (!field) return <td key={action} style={{ textAlign: "center" }}>—</td>;
                      return <td key={action} style={{ textAlign: "center" }}><span style={{ color: role[field] ? "#10b981" : "#f43f5e", fontWeight: "700" }}>{role[field] ? "✓" : "✗"}</span></td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function UserManagement() {
    const [activeTab, setActiveTab] = useState("users");
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [staffLimit, setStaffLimit] = useState(5);
    const [loading, setLoading] = useState(true);

    const [showUserModal, setShowUserModal] = useState(false);
    const [editUserMode, setEditUserMode] = useState(false);

    const [showRoleModal, setShowRoleModal] = useState(false);

    const emptyUserForm = {
      id: null,
      full_name: "",
      username: "",
      email: "",
      mobile: "",
      password: "",
      role: "staff",
      custom_role: "",
      is_active: true,
    };

    const [userForm, setUserForm] = useState(emptyUserForm);
    const [roleForm, setRoleForm] = useState({ name: "", description: "", ...DEFAULT_PERMS });

    useEffect(() => {
      fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
      try {
        const [uRes, rRes] = await Promise.all([
          API.get(API_ENDPOINTS.auth.users),
          API.get(API_ENDPOINTS.auth.roles),
        ]);
        
        if (uRes.data && uRes.data.users) {
          setUsers(uRes.data.users);
          setStaffLimit(uRes.data.staff_limit);
        } else {
          setUsers(uRes.data);
        }
        
        setRoles(rRes.data);
      } catch (err) {
        toast.error("Failed to load initial data");
      } finally {
        setLoading(false);
      }
    };

    const handleCreateOrUpdateUser = async (e) => {
      e.preventDefault();
      try {
        if (editUserMode) {
          await API.put(API_ENDPOINTS.auth.userUpdate(userForm.id), userForm);
          toast.success(`User details updated successfully!`, { duration: 4000, icon: '🔵' });
        } else {
          await API.post(API_ENDPOINTS.auth.register, userForm);
          toast.success(`User ${userForm.full_name || userForm.username} created successfully!`, { duration: 4000 });
        }
        setShowUserModal(false);
        setUserForm(emptyUserForm);
        fetchInitialData();
      } catch (err) {
        let msg = err.response?.data?.error || err.response?.data?.detail || "Registration failed.";
        if (err.response?.data?.email) msg = "Email already exists. Please use different email.";
        if (err.response?.data?.mobile) msg = "Mobile number already exists.";
        if (err.response?.data?.username) msg = "Username already exists.";
        toast.error(msg, { duration: 6000 });
      }
    };

    const handleCreateRole = async (e) => {
      e.preventDefault();
      try {
        await API.post(API_ENDPOINTS.auth.roles, roleForm);
        setShowRoleModal(false);
        setRoleForm({ name: "", description: "", ...DEFAULT_PERMS });
        fetchInitialData();
        toast.success("CRUD Role created.");
      } catch (err) {
        toast.error(err.response?.data?.error || "Role creation failed.");
      }
    };

    const deleteUser = async (u) => {
      if (!window.confirm("Are you sure you want to delete this user?")) return;
      try {
        await API.delete(API_ENDPOINTS.auth.userDelete(u.id));
        toast(`User ${u.full_name || u.username} deleted successfully!`, { icon: '🟠', duration: 4000 });
        fetchInitialData();
      } catch {
        toast.error("Delete failed");
      }
    };

    const resetPassword = (u) => {
      const pw = prompt(`Enter new password for ${u.username}:`);
      if (!pw || pw.length < 8) {
        if (pw !== null) alert("Password must be at least 8 characters");
        return;
      }
      API.put(API_ENDPOINTS.auth.userUpdate(u.id), { password: pw }).then(() => {
        toast.success("Password reset successfully!");
      }).catch(() => {
        toast.error("Failed to reset password.");
      });
    };

    const openEditUser = (u) => {
      setUserForm({
        id: u.id,
        full_name: u.full_name || "",
        username: u.username,
        email: u.email,
        mobile: u.mobile || "",
        password: "", // empty for edit
        role: u.role,
        custom_role: u.custom_role,
        is_active: u.is_active,
      });
      setEditUserMode(true);
      setShowUserModal(true);
    };

    const openAddUser = () => {
      setUserForm(emptyUserForm);
      setEditUserMode(false);
      setShowUserModal(true);
    };

    const deleteRole = async (id) => {
      if (!window.confirm("Delete this role? Staff using it will lose custom permissions.")) return;
      try {
        await API.delete(API_ENDPOINTS.auth.role(id));
        fetchInitialData();
        toast("Role deleted", { icon: "🗑️" });
      } catch {
        toast.error("Delete failed");
      }
    };

    const tabBtn = (tab, label, icon) => (
      <button onClick={() => setActiveTab(tab)} style={{ padding: "0.75rem 1.5rem", border: "none", background: "none", fontWeight: "700", cursor: "pointer", fontSize: "0.95rem", color: activeTab === tab ? "var(--primary)" : "var(--text-muted)", borderBottom: `3px solid ${activeTab === tab ? "var(--primary)" : "transparent"}`, display: "flex", alignItems: "center", gap: "6px" }}>
        {icon} {label}
      </button>
    );

    const roleBadgeColor = { admin: "#b45309", manager: "#6d28d9", pharmacist: "#15803d", cashier: "#0f766e", staff: "#0369a1" };
    const roleBadgeBg = { admin: "#fef3c7", manager: "#ede9fe", pharmacist: "#dcfce7", cashier: "#ccfbf1", staff: "#e0f2fe" };

    return (
      <Layout>
        <Toaster position="top-right" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Fingerprint size={30} style={{ color: "var(--primary)" }} />
            <div>
              <h2 style={{ margin: 0 }}>User Management</h2>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.875rem" }}>Manage staff accounts & permissions</p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.5rem", borderBottom: "2px solid var(--border)" }}>
          {tabBtn("users", "Staff Members", <Users size={16} />)}
          {tabBtn("roles", "CRUD Roles", <ShieldCheck size={16} />)}
        </div>

        {activeTab === "users" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div style={{ position: "relative" }}>
                {/* Search bar placeholder as requested by spec */}
                <input type="text" placeholder="Search by name, email, role..." className="custom-input" style={{ width: "300px", paddingLeft: "36px" }} />
                <Users size={16} style={{ position: "absolute", left: "12px", top: "12px", color: "#94a3b8" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "700", padding: "6px 12px", borderRadius: "8px", backgroundColor: users.length >= staffLimit ? "#fee2e2" : "#f1f5f9", color: users.length >= staffLimit ? "#dc2626" : "#475569" }}>
                  Active Users: {users.length} / {staffLimit} Limit
                </span>
                <button className="btn-primary" onClick={openAddUser} disabled={users.length >= staffLimit} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", borderRadius: "10px", padding: "0.6rem 1.2rem", opacity: users.length >= staffLimit ? 0.5 : 1, cursor: users.length >= staffLimit ? "not-allowed" : "pointer" }}>
                  <UserPlus size={16} /> Add Staff Member
                </button>
              </div>
            </div>
            <div className="card" style={{ padding: 0, borderRadius: "14px", overflow: "hidden" }}>
              <table className="table">
                <thead style={{ background: "#f8fafc" }}>
                  <tr>
                    <th style={{ width: "50px" }}>Sr No.</th>
                    <th style={{ width: "200px" }}>Full Name / Details</th>
                    <th style={{ width: "220px" }}>Email & Contact</th>
                    <th style={{ width: "120px" }}>Role</th>
                    <th style={{ width: "100px" }}>Status</th>
                    <th style={{ width: "180px" }}>Last Login</th>
                    <th style={{ width: "150px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id}>
                      <td style={{ color: "var(--text-muted)", fontWeight: "600" }}>{i + 1}</td>
                      <td>
                        <div style={{ fontWeight: "700" }}>{u.full_name || u.username}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>@{u.username}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: "0.85rem", color: "#475569" }}>{u.email}</div>
                        <div style={{ fontSize: "0.80rem", color: "var(--text-muted)" }}>{u.mobile}</div>
                      </td>
                      <td>
                        <span style={{ background: roleBadgeBg[u.role] || "#f1f5f9", color: roleBadgeColor[u.role] || "#475569", padding: "3px 10px", borderRadius: "12px", fontSize: "0.78rem", fontWeight: "700", textTransform: "capitalize" }}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span style={{ background: u.is_active ? "#ecfdf5" : "#fef2f2", color: u.is_active ? "#10b981" : "#dc2626", padding: "4px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "800" }}>
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {u.last_login ? new Date(u.last_login).toLocaleString() : "Never"}
                        {u.failed_login_attempts > 0 && <span style={{ display: 'block', color: 'red' }}>({u.failed_login_attempts} failed attempts)</span>}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={() => openEditUser(u)} title="Edit" style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", color: "#1e40af", cursor: "pointer" }}><Pencil size={14} /></button>
                          <button onClick={() => resetPassword(u)} title="Reset Password" style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "6px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", color: "#b45309", cursor: "pointer" }}><Undo2 size={14} /></button>
                          <button onClick={() => deleteUser(u)} title="Delete" style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "6px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626", cursor: "pointer" }}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ROLES TAB IS UNCHANGED */}
        {activeTab === "roles" && (
          <>
            <div style={{ textAlign: "right", marginBottom: "1rem" }}>
              <button className="btn-primary" onClick={() => setShowRoleModal(true)} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", borderRadius: "10px", padding: "0.6rem 1.2rem" }}><Plus size={16} /> Create New Role</button>
            </div>
            <div className="stats-grid">{roles.map((r) => <RoleCard key={r.id} role={r} onDelete={deleteRole} />)}</div>
          </>
        )}

        {/* ─── ADD/EDIT USER MODAL ─── */}
        {showUserModal && (
  <div style={{
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3000,
    padding: "1rem"
  }}>
    <div className="card" style={{
      width: "100%",
      maxWidth: "560px",
      borderRadius: "20px",
      padding: "2rem"
    }}>

      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1.5rem"
      }}>
        <h3 style={{ margin: 0 }}>
          {editUserMode ? "Edit Staff Member" : "Add Staff Member"}
        </h3>

        <button
          onClick={() => setShowUserModal(false)}
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleCreateOrUpdateUser}>

        <div className="form-group">
          <label>Full Name *</label>
          <input
            required
            className="custom-input"
            value={userForm.full_name}
            onChange={(e) =>
              setUserForm({ ...userForm, full_name: e.target.value })
            }
          />
        </div>

        <div className="form-group">
          <label>Username *</label>
          <input
            required
            disabled={editUserMode}
            className="custom-input"
            value={userForm.username}
            onChange={(e) =>
              setUserForm({ ...userForm, username: e.target.value })
            }
          />
        </div>

        <div className="form-group">
          <label>Email *</label>
          <input
            required
            type="email"
            className="custom-input"
            value={userForm.email}
            onChange={(e) =>
              setUserForm({ ...userForm, email: e.target.value })
            }
          />
        </div>

        <div className="form-group">
          <label>Mobile *</label>
          <input
            required
            maxLength={10}
            className="custom-input"
            value={userForm.mobile}
            onChange={(e) =>
              setUserForm({
                ...userForm,
                mobile: e.target.value.replace(/\D/g, "")
              })
            }
          />
        </div>

        <div className="form-group">
          <label>Role *</label>
          <select
            className="custom-input"
            value={userForm.custom_role || ""}
            onChange={(e) =>
              setUserForm({
                ...userForm,
                role: "staff",
                custom_role: e.target.value
              })
            }
          >
            <option value="">Select Role</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginTop: "10px"
        }}>
          <label>Status</label>

          <button
            type="button"
            onClick={() =>
              setUserForm({
                ...userForm,
                is_active: !userForm.is_active
              })
            }
            style={{
              background: userForm.is_active ? "#10b981" : "#e2e8f0",
              border: "none",
              borderRadius: "20px",
              width: "40px",
              height: "24px",
              position: "relative",
              cursor: "pointer"
            }}
          >
            <div style={{
              width: "18px",
              height: "18px",
              background: "white",
              borderRadius: "50%",
              position: "absolute",
              top: "3px",
              left: userForm.is_active ? "19px" : "3px"
            }} />
          </button>

          <span>
            {userForm.is_active ? "Active" : "Inactive"}
          </span>
        </div>

        {!editUserMode && (
          <div className="form-group">
            <label>Password</label>
            <input
              type="text"
              className="custom-input"
              value={userForm.password}
              onChange={(e) =>
                setUserForm({ ...userForm, password: e.target.value })
              }
            />
          </div>
        )}

        <div style={{
          display: "flex",
          gap: "10px",
          marginTop: "20px"
        }}>

          <button
            type="submit"
            className="btn-primary"
            style={{ flex: 1 }}
          >
            {editUserMode ? "Update User" : "Create User"}
          </button>

          <button
            type="button"
            onClick={() => setShowUserModal(false)}
            style={{
              flex: 1,
              border: "1px solid #cbd5e1",
              background: "white"
            }}
          >
            Cancel
          </button>

        </div>

      </form>

    </div>
  </div>
)}

        {/* CREATE ROLE MODAL */}
        {showRoleModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, padding: "1rem" }}>
            <div className="card" style={{ width: "100%", maxWidth: "600px", borderRadius: "20px", padding: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                <h3 style={{ margin: 0 }}>Create CRUD Role</h3>
                <button onClick={() => setShowRoleModal(false)} style={{ background: "none", border: "none" }}><X size={20} /></button>
              </div>
              <form onSubmit={handleCreateRole}>
                <div className="form-group"><label>Role Name *</label><input required className="custom-input" value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} /></div>
                <div className="form-group"><label>Description</label><input className="custom-input" value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} /></div>
                <div style={{ marginTop: "1.5rem", marginBottom: "1.5rem" }}>
                  <p style={{ fontWeight: "700", marginBottom: "10px" }}>Permissions</p>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                      <thead><tr><th style={{ textAlign: "left" }}>Module</th>{["Create", "Read", "Update", "Delete"].map((h) => <th key={h} style={{ textAlign: "center" }}>{h}</th>)}</tr></thead>
                      <tbody>
                        {MODULES.map((mod, i) => (
                          <tr key={mod.key} style={{ background: i % 2 === 0 ? "white" : "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "0.7rem 1rem" }}><span style={{ background: mod.bg, color: mod.color, padding: "3px 10px", borderRadius: "8px", fontWeight: "700", fontSize: "0.82rem" }}>{mod.label}</span></td>
                            <CrudCell field={mod.permissions.create} roleForm={roleForm} setRoleForm={setRoleForm} />
                            <CrudCell field={mod.permissions.read} roleForm={roleForm} setRoleForm={setRoleForm} />
                            <CrudCell field={mod.permissions.update} roleForm={roleForm} setRoleForm={setRoleForm} />
                            <CrudCell field={mod.permissions.delete} roleForm={roleForm} setRoleForm={setRoleForm} />
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <button type="submit" className="btn-primary" style={{ width: "100%" }}>Save Role</button>
              </form>
            </div>
          </div>
        )}
      </Layout>
    );
  }
  export default UserManagement;
