import { useEffect, useState } from "react";
import API from "../services/api";
import { API_ENDPOINTS } from "../services/endpoints";
import Layout from "../components/Layout";
import { 
    History, Search, User, Clock, Filter, ShieldAlert
} from "lucide-react";

function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterAction, setFilterAction] = useState("all");

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const res = await API.get(API_ENDPOINTS.auth.auditLogs);
            setLogs(res.data);
        } catch (err) {
            console.error("Error fetching audit logs", err);
        } finally {
            setLoading(false);
        }
    };

    const actions = ["all", "POST", "PUT", "PATCH", "DELETE"];

    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              log.module_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesAction = filterAction === "all" || log.action_type === filterAction;
        return matchesSearch && matchesAction;
    });

    const getActionColor = (action) => {
        switch (action) {
            case 'POST': return '#10b981'; // Green (Create)
            case 'DELETE': return '#ef4444'; // Red (Delete)
            case 'PUT':
            case 'PATCH': return '#f59e0b'; // Amber (Update)
            default: return 'var(--text-muted)';
        }
    };

    const getActionLabel = (action) => {
        switch (action) {
            case 'POST': return 'CREATE';
            case 'PUT':
            case 'PATCH': return 'UPDATE';
            case 'DELETE': return 'DELETE';
            default: return action;
        }
    };

    return (
        <Layout 
            title="System Audit Logs" 
            subtitle="Secure, tamper-evident trail of all sensitive business operations"
            icon={<History size={24} />}
        >
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {/* Header Controls */}
                <div className="card" style={{ padding: "1.25rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
                    <div className="search-wrapper" style={{ minWidth: "250px" }}>
                        <Search className="search-icon" size={18} />
                        <input 
                            placeholder="Search by User or Module..." 
                            className="custom-input" 
                            style={{ paddingLeft: "42px" }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <Filter size={16} className="text-muted" />
                        <select 
                            className="custom-input" 
                            style={{ width: "auto" }}
                            value={filterAction}
                            onChange={(e) => setFilterAction(e.target.value)}
                        >
                            {actions.map(a => <option key={a} value={a}>{a === 'all' ? 'All Actions' : getActionLabel(a)}</option>)}
                        </select>
                    </div>

                    <button className="btn-secondary" onClick={fetchLogs}>
                        <Clock size={16} /> Refresh logs
                    </button>
                </div>

                {/* Logs Table */}
                <div className="table-container shadow-sm">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>User</th>
                                <th>Module</th>
                                <th>Action</th>
                                <th>Status / Path</th>
                                <th>Payload Summary</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ textAlign: "center", padding: "3rem" }}>Loading secure logs...</td></tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr><td colSpan="6" style={{ textAlign: "center", padding: "3rem" }}>No matching logs found.</td></tr>
                            ) : filteredLogs.map((log) => (
                                <tr key={log.id}>
                                    <td>
                                        <div style={{ fontWeight: "700", color: "#64748b" }}>{new Date(log.created_at).toLocaleDateString()}</div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{new Date(log.created_at).toLocaleTimeString()}</div>
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                                                <User size={14} />
                                            </div>
                                            <span style={{ fontWeight: "600" }}>{log.username || 'System'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ color: "var(--primary)", fontWeight: "640", background: "var(--primary-light)", padding: "2px 8px", borderRadius: "8px", fontSize: "0.8rem" }}>
                                            {log.module_name}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: getActionColor(log.action_type) }}></div>
                                            <span style={{ fontWeight: "750", fontSize: "0.75rem" }}>{getActionLabel(log.action_type)}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: "0.8rem", color: "#64748b", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            <span style={{ color: log.new_value?.status < 400 ? "#10b981" : "#ef4444", fontWeight: "700" }}>
                                                {log.new_value?.status}
                                            </span>
                                            {" "}{log.new_value?.path}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: "0.75rem", background: "#f8fafc", padding: "4px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", color: "#475569", fontFamily: "monospace", maxWidth: "400px", maxHeight: "60px", overflow: "auto" }}>
                                            {log.new_value?.payload ? JSON.stringify(log.new_value.payload) : 'No payload captured'}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer Insight */}
                <div style={{ display: "flex", gap: "1rem", alignItems: "center", padding: "1rem", background: "#fef2f2", borderRadius: "12px", border: "1px solid #fee2e2" }}>
                    <ShieldAlert className="text-danger" size={20} />
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "#991b1b" }}>
                        <strong>Compliance Note:</strong> Audit logs are read-only and immutable. These logs capture who did what and when, ensuring accountability across your pharmacy operations.
                    </p>
                </div>
            </div>
        </Layout>
    );
}

export default AuditLogs;
