import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { axiosInstance } from "../lib/axios.js";
import { Users, MessageSquare, Activity, Layers, Trash2, ShieldCheck, ShieldOff, ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import toast from "react-hot-toast";

const StatCard = ({ icon: Icon, label, value, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-base-100 rounded-2xl p-5 flex items-center gap-4 border border-base-300 shadow-sm"
  >
    <div className={`size-12 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="size-6" />
    </div>
    <div>
      <p className="text-2xl font-bold">{value ?? "—"}</p>
      <p className="text-xs text-base-content/50">{label}</p>
    </div>
  </motion.div>
);

const AdminPage = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  const limit = 10;
  const totalPages = Math.ceil(total / limit);

  const fetchStats = async () => {
    try {
      const res = await axiosInstance.get("/admin/stats");
      setStats(res.data);
    } catch {
      toast.error("Failed to load stats");
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axiosInstance.get("/admin/users", {
        params: { page, limit, search },
      });
      setUsers(res.data.users);
      setTotal(res.data.total);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchUsers(); }, [page, search]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const toggleRole = async (userId, currentRole) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    try {
      await axiosInstance.put(`/admin/users/${userId}/role`, { role: newRole });
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, role: newRole } : u));
      toast.success(`Role updated to ${newRole}`);
    } catch {
      toast.error("Failed to update role");
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm("Delete this user and all their messages?")) return;
    try {
      await axiosInstance.delete(`/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      setTotal((t) => t - 1);
      toast.success("User deleted");
    } catch {
      toast.error("Failed to delete user");
    }
  };

  return (
    <div className="min-h-screen bg-base-200 pt-20 pb-10 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold">Admin Panel</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard icon={Users} label="Total Users" value={stats?.totalUsers} color="bg-primary/10 text-primary" />
          <StatCard icon={MessageSquare} label="Total Messages" value={stats?.totalMessages} color="bg-secondary/10 text-secondary" />
          <StatCard icon={Activity} label="Active (7d)" value={stats?.activeUsers} color="bg-success/10 text-success" />
          <StatCard icon={Layers} label="Groups" value={stats?.totalGroups} color="bg-warning/10 text-warning" />
          <StatCard icon={Users} label="New Today" value={stats?.newUsersToday} color="bg-info/10 text-info" />
          <StatCard icon={MessageSquare} label="Msgs Today" value={stats?.messagesToday} color="bg-error/10 text-error" />
        </div>

        {/* Chart */}
        {stats?.msgPerDay?.length > 0 && (
          <div className="bg-base-100 rounded-2xl p-6 border border-base-300 shadow-sm">
            <h2 className="text-sm font-semibold mb-4 text-base-content/60 uppercase tracking-wide">Messages — Last 7 Days</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.msgPerDay} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, fontSize: 12 }}
                  cursor={{ fill: "currentColor", fillOpacity: 0.05 }}
                />
                <Bar dataKey="count" fill="oklch(var(--p))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* User table */}
        <div className="bg-base-100 rounded-2xl border border-base-300 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-base-300 flex items-center gap-3">
            <h2 className="font-semibold flex-1">Users</h2>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                className="input input-sm input-bordered rounded-xl w-48"
                placeholder="Search name / email…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <button type="submit" className="btn btn-sm btn-primary rounded-xl">Search</button>
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr className="text-xs text-base-content/50">
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j}><div className="skeleton h-4 w-full rounded" /></td>
                      ))}
                    </tr>
                  ))
                ) : users.map((u) => (
                  <tr key={u._id} className="hover:bg-base-200/50 transition-colors">
                    <td>
                      <div className="flex items-center gap-2">
                        <img src={u.profilePic || "/avatar.png"} className="size-8 rounded-full object-cover" alt="" />
                        <span className="font-medium text-sm">{u.fullName}</span>
                      </div>
                    </td>
                    <td className="text-xs text-base-content/60">{u.email}</td>
                    <td>
                      <span className={`badge badge-xs ${u.role === "admin" ? "badge-primary" : "badge-ghost"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="text-xs text-base-content/50">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="btn btn-ghost btn-xs tooltip"
                          data-tip={u.role === "admin" ? "Revoke admin" : "Make admin"}
                          onClick={() => toggleRole(u._id, u.role)}
                        >
                          {u.role === "admin"
                            ? <ShieldOff className="size-3.5 text-warning" />
                            : <ShieldCheck className="size-3.5 text-primary" />
                          }
                        </button>
                        <button
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => deleteUser(u._id)}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-base-300 flex items-center justify-between">
              <span className="text-xs text-base-content/50">
                Page {page} of {totalPages} · {total} users
              </span>
              <div className="flex gap-1">
                <button
                  className="btn btn-ghost btn-xs btn-circle"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <button
                  className="btn btn-ghost btn-xs btn-circle"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
