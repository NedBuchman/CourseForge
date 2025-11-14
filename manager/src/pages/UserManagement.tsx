import { useState, useEffect } from 'react';
import { Users, Shield, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  created_at: string;
  role?: string;
  last_sign_in_at?: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const rolesMap = new Map(rolesData.map(r => [r.user_id, r.role]));

      const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();

      if (authError) throw authError;

      const usersWithRoles = authUsers.map(user => ({
        id: user.id,
        email: user.email || '',
        created_at: user.created_at,
        role: rolesMap.get(user.id) || 'creator',
        last_sign_in_at: user.last_sign_in_at,
      }));

      setUsers(usersWithRoles);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    setUpdating(userId);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'User role updated successfully' });
      await fetchUsers();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update role' });
    } finally {
      setUpdating(null);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-600">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Loading users...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">User Management</h2>
            <p className="text-slate-600">Manage user roles and permissions</p>
          </div>
        </div>
        <button
          onClick={fetchUsers}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg border flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <p className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {message.text}
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b-2 border-slate-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Email</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Role</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Created</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Last Sign In</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm text-slate-900">{user.email}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getRoleBadgeColor(
                      user.role || 'creator'
                    )}`}
                  >
                    <Shield className="w-3 h-3" />
                    {user.role || 'creator'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {user.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleDateString()
                    : 'Never'}
                </td>
                <td className="px-6 py-4">
                  <select
                    value={user.role || 'creator'}
                    onChange={(e) => updateUserRole(user.id, e.target.value)}
                    disabled={updating === user.id}
                    className="px-3 py-1 border-2 border-slate-200 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-500 transition-colors"
                  >
                    <option value="creator">Creator</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="p-12 text-center text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No users found</p>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-bold text-blue-900 mb-2">Role Definitions</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li><strong>Creator:</strong> Can create and manage their own courses</li>
          <li><strong>Manager:</strong> Can view analytics and moderate content</li>
          <li><strong>Admin:</strong> Full access including user management</li>
        </ul>
      </div>
    </div>
  );
}
