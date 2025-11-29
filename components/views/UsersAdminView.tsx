'use client';

import React, { useState, useEffect } from 'react';
import { 
  listUsers, 
  getUserRoles, 
  getAllowlist, 
  addAllowlist, 
  deleteAllowlist, 
  deleteUser, 
  listRoles, 
  assignRoleToUser, 
  unassignRoleFromUser, 
  getPendingRoles, 
  assignPendingRole, 
  unassignPendingRole, 
  RoleDto, 
  UserDto 
} from '@/lib/api';

export default function UsersAdminView() {
  const [usersList, setUsersList] = useState<any[]>([]);
  const [allowlist, setAllowlist] = useState<any[]>([]);
  const [allowPattern, setAllowPattern] = useState('');
  const [makeAdminOnRegister, setMakeAdminOnRegister] = useState(false);
  const [allRoles, setAllRoles] = useState<RoleDto[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean; userId?: string; userName?: string}>({show: false});
  const [deleteAllowlistConfirm, setDeleteAllowlistConfirm] = useState<{show: boolean; allowlistId?: string; pattern?: string}>({show: false});
  const [editingRolesFor, setEditingRolesFor] = useState<string | null>(null);
  const [pendingRoleAssignments, setPendingRoleAssignments] = useState<Record<string, RoleDto[]>>({});

  // Load roles on mount
  useEffect(() => {
    (async () => {
      try {
        const roles = await listRoles();
        setAllRoles(roles);
      } catch (e) {
        console.error('Failed loading roles', e);
      }
    })();
  }, []);

  // Load users and allowlist on mount
  useEffect(() => {
    (async () => {
      try {
        const [ulist, alist] = await Promise.all([listUsers(), getAllowlist()]);
        // fetch roles for each user (parallel)
        const rolesList = await Promise.all(ulist.map((u: UserDto) => getUserRoles(u.id).catch(() => [] as RoleDto[])));
        const merged = ulist.map((u: UserDto, idx: number) => ({ ...u, roles: rolesList[idx] }));
        setUsersList(merged);
        setAllowlist(alist);

        // Load pending role assignments for all invited users (email-type allowlist entries)
        const emailEntries = alist.filter((e: any) => e.type === 'email');
        const pendingRolesMap: Record<string, RoleDto[]> = {};
        
        await Promise.all(
          emailEntries.map(async (e: any) => {
            const emailLower = e.pattern.toLowerCase();
            // Check if user is already registered
            const isRegistered = merged.some((u: any) => u.email?.toLowerCase() === emailLower);
            if (!isRegistered) {
              try {
                const roles = await getPendingRoles(e.pattern);
                pendingRolesMap[emailLower] = roles;
              } catch (err) {
                console.error(`Failed to load pending roles for ${e.pattern}:`, err);
                pendingRolesMap[emailLower] = [];
              }
            }
          })
        );

        setPendingRoleAssignments(pendingRolesMap);
      } catch (e) {
        console.error('Failed loading admin data', e);
      }
    })();
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto space-y-4">
        {/* Allowlist Management Section */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-semibold mb-3">Allowlist Management</h2>
          <div className="space-y-2 mb-3">
            <div className="flex space-x-2">
              <input
                type="text"
                value={allowPattern}
                onChange={(e) => setAllowPattern(e.target.value)}
                placeholder="Enter pattern (email, @domain.com, *.example.com)"
                className="flex-1 p-2 border rounded"
              />
              <button
                onClick={async () => { 
                  if (!allowPattern) return; 
                  try { 
                    await addAllowlist(allowPattern); 
                    setAllowPattern(''); 
                    setMakeAdminOnRegister(false);
                    const al = await getAllowlist(); 
                    setAllowlist(al);
                  } catch(e:any){ 
                    alert(e?.message || 'Failed to add'); 
                  } 
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded"
              >Add</button>
            </div>
            {allowPattern.includes('@') && !allowPattern.startsWith('@') && !allowPattern.includes('*') && (
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={makeAdminOnRegister}
                  onChange={(e) => setMakeAdminOnRegister(e.target.checked)}
                  className="rounded"
                />
                <span>Assign ADMIN role when user registers</span>
              </label>
            )}
          </div>
          <div className="border rounded overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">Pattern</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Created</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {allowlist.filter((e:any) => e.type !== 'email').map((e:any) => (
                  <tr key={e.id} className="border-t">
                    <td className="p-2">{e.pattern}</td>
                    <td className="p-2 uppercase text-xs">{e.type}</td>
                    <td className="p-2 text-xs">{new Date(e.created_at).toLocaleString()}</td>
                    <td className="p-2 text-right">
                      <button 
                        onClick={() => setDeleteAllowlistConfirm({show: true, allowlistId: e.id, pattern: e.pattern})} 
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      >Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Users Management Section */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-semibold mb-3">Users</h2>
          <div className="border rounded overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Roles</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {/* Show registered users */}
                {usersList.map((u:any) => {
                  const roles = (u.roles || []) as RoleDto[];
                  return (
                    <tr key={u.id} className="border-t">
                      <td className="p-2">{u.name}</td>
                      <td className="p-2">{u.email}</td>
                      <td className="p-2">
                        {editingRolesFor === u.id ? (
                          <div className="space-y-1">
                            <div className="flex flex-wrap gap-1 mb-1">
                              {roles.map(r => (
                                <span key={r.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                                  {r.roleName}
                                  <button
                                    onClick={async () => {
                                      try {
                                        await unassignRoleFromUser(u.id, r.id);
                                        const updatedRoles = await getUserRoles(u.id);
                                        setUsersList(usersList.map(usr => 
                                          usr.id === u.id ? { ...usr, roles: updatedRoles } : usr
                                        ));
                                      } catch (e: any) {
                                        alert(e?.message || 'Failed to remove role');
                                      }
                                    }}
                                    className="ml-1 text-blue-600 hover:text-blue-800"
                                    title="Remove role"
                                  >×</button>
                                </span>
                              ))}
                            </div>
                            <select
                              className="text-xs border rounded p-1"
                              value=""
                              onChange={async (e) => {
                                const roleId = e.target.value;
                                if (!roleId) return;
                                try {
                                  await assignRoleToUser(u.id, roleId);
                                  const updatedRoles = await getUserRoles(u.id);
                                  setUsersList(usersList.map(usr => 
                                    usr.id === u.id ? { ...usr, roles: updatedRoles } : usr
                                  ));
                                  e.target.value = '';
                                } catch (error: any) {
                                  alert(error?.message || 'Failed to assign role');
                                }
                              }}
                            >
                              <option value="">Add role...</option>
                              {allRoles.filter(r => !roles.some(ur => ur.id === r.id)).map(r => (
                                <option key={r.id} value={r.id}>{r.roleName}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => setEditingRolesFor(null)}
                              className="ml-2 text-xs text-gray-600 hover:text-gray-800"
                            >Done</button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1">
                            <span className="text-xs">{roles.map(r => r.roleName).join(', ') || '-'}</span>
                            <button
                              onClick={() => setEditingRolesFor(u.id)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                              title="Edit roles"
                            >✏️</button>
                          </div>
                        )}
                      </td>
                      <td className="p-2 text-right">
                        <button
                          onClick={() => setDeleteConfirm({show: true, userId: u.id, userName: u.name || u.email})}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >Delete</button>
                      </td>
                    </tr>
                  );
                })}
                {/* Show email-type allowlist entries (invited but not yet registered) */}
                {allowlist.filter((e:any) => e.type === 'email').map((e:any) => {
                  const isRegistered = usersList.some((u:any) => u.email?.toLowerCase() === e.pattern.toLowerCase());
                  if (isRegistered) return null;
                  const emailLower = e.pattern.toLowerCase();
                  const pendingKey = `email:${emailLower}`;
                  const roles = pendingRoleAssignments[emailLower] || [];
                  return (
                    <tr key={`allowlist-${e.id}`} className="border-t bg-gray-50">
                      <td className="p-2 italic text-gray-500">Invited (not registered)</td>
                      <td className="p-2">{e.pattern}</td>
                      <td className="p-2">
                        {editingRolesFor === pendingKey ? (
                          <div className="space-y-1">
                            <div className="flex flex-wrap gap-1 mb-1">
                              {roles.map(r => (
                                <span key={r.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                                  {r.roleName}
                                  <button
                                    onClick={async () => {
                                      try {
                                        await unassignPendingRole(e.pattern, r.id);
                                        const updated = { ...pendingRoleAssignments };
                                        if (!updated[emailLower]) updated[emailLower] = [];
                                        updated[emailLower] = updated[emailLower].filter(role => role.id !== r.id);
                                        if (updated[emailLower].length === 0) {
                                          delete updated[emailLower];
                                        }
                                        setPendingRoleAssignments(updated);
                                      } catch (err: any) {
                                        alert(err?.message || 'Failed to remove role');
                                      }
                                    }}
                                    className="ml-1 text-blue-600 hover:text-blue-800"
                                    title="Remove role"
                                  >×</button>
                                </span>
                              ))}
                            </div>
                            <select
                              className="text-xs border rounded p-1"
                              value=""
                              onChange={async (evt) => {
                                const roleId = evt.target.value;
                                if (!roleId) return;
                                const role = allRoles.find(r => r.id === roleId);
                                if (!role) return;
                                try {
                                  await assignPendingRole(e.pattern, roleId);
                                  const updated = { ...pendingRoleAssignments };
                                  if (!updated[emailLower]) updated[emailLower] = [];
                                  if (!updated[emailLower].some(r => r.id === role.id)) {
                                    updated[emailLower] = [...updated[emailLower], role];
                                    setPendingRoleAssignments(updated);
                                  }
                                  evt.target.value = '';
                                } catch (err: any) {
                                  alert(err?.message || 'Failed to assign role');
                                }
                              }}
                            >
                              <option value="">Add role...</option>
                              {allRoles.filter(r => !roles.some(ur => ur.id === r.id)).map(r => (
                                <option key={r.id} value={r.id}>{r.roleName}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => setEditingRolesFor(null)}
                              className="ml-2 text-xs text-gray-600 hover:text-gray-800"
                            >Done</button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1">
                            <span className="text-xs">{roles.map(r => r.roleName).join(', ') || '-'}</span>
                            <button
                              onClick={() => setEditingRolesFor(pendingKey)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                              title="Edit roles"
                            >✏️</button>
                          </div>
                        )}
                      </td>
                      <td className="p-2"></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delete User Confirmation Modal */}
        {deleteConfirm.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Confirm Delete User</h3>
              <p className="mb-4">
                Are you sure you want to delete user <strong>{deleteConfirm.userName}</strong>? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteConfirm({show: false})}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!deleteConfirm.userId) return;
                    try {
                      await deleteUser(deleteConfirm.userId);
                      setUsersList(usersList.filter(u => u.id !== deleteConfirm.userId));
                      setDeleteConfirm({show: false});
                    } catch (error: any) {
                      alert(error?.message || 'Failed to delete user');
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Allowlist Confirmation Modal */}
        {deleteAllowlistConfirm.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Confirm Delete Pattern</h3>
              <p className="mb-4">
                Are you sure you want to delete pattern <strong>{deleteAllowlistConfirm.pattern}</strong>? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteAllowlistConfirm({show: false})}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!deleteAllowlistConfirm.allowlistId) return;
                    try {
                      await deleteAllowlist(deleteAllowlistConfirm.allowlistId);
                      const al = await getAllowlist();
                      setAllowlist(al);
                      setDeleteAllowlistConfirm({show: false});
                    } catch (error: any) {
                      alert(error?.message || 'Failed to delete pattern');
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

