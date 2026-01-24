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
 <div className="bg-surface rounded-lg shadow-sm border border-outline p-4">
 <h2 className="text-lg font-semibold mb-3 text-content-primary">Allowlist Management</h2>
 <div className="space-y-2 mb-3">
 <div className="flex space-x-2">
 <input
 type="text"
 value={allowPattern}
 onChange={(e) => setAllowPattern(e.target.value)}
 placeholder="Enter pattern (email, @domain.com, *.example.com)"
 className="flex-1 p-2 border border-outline-strong rounded bg-surface-elevated text-content-primary placeholder-content-muted"
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
 className="px-3 py-2 bg-brand text-white rounded hover:bg-brand-hover"
 >Add</button>
 </div>
 {allowPattern.includes('@') && !allowPattern.startsWith('@') && !allowPattern.includes('*') && (
 <label className="flex items-center space-x-2 text-sm text-content-secondary">
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
 <div className="border border-outline-strong rounded overflow-x-auto">
 <table className="w-full min-w-max text-sm">
 <thead className="bg-surface-elevated">
 <tr>
 <th className="text-left p-2 text-content-secondary">Pattern</th>
 <th className="text-left p-2 text-content-secondary">Type</th>
 <th className="text-left p-2 text-content-secondary">Created</th>
 <th className="p-2"></th>
 </tr>
 </thead>
 <tbody>
 {allowlist.filter((e:any) => e.type !== 'email').map((e:any) => (
 <tr key={e.id} className="border-t border-outline">
 <td className="p-2 text-content-primary text-content-secondary">{e.pattern}</td>
 <td className="p-2 uppercase text-xs text-content-secondary text-content-muted">{e.type}</td>
 <td className="p-2 text-xs text-content-tertiary">{new Date(e.created_at).toLocaleString()}</td>
 <td className="p-2 text-right">
 <button 
 onClick={() => setDeleteAllowlistConfirm({show: true, allowlistId: e.id, pattern: e.pattern})} 
 className="px-2 py-1 text-xs bg-red-600 dark:bg-red-700 text-white rounded hover:bg-red-700 hover:bg-red-600"
 >Delete</button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 {/* Users Management Section */}
 <div className="bg-surface rounded-lg shadow-sm border border-outline p-4">
 <h2 className="text-lg font-semibold mb-3 text-content-primary">Users</h2>
 <div className="border border-outline-strong rounded overflow-x-auto">
 <table className="w-full min-w-max text-sm">
 <thead className="bg-surface-elevated">
 <tr>
 <th className="text-left p-2 text-content-secondary">Name</th>
 <th className="text-left p-2 text-content-secondary">Email</th>
 <th className="text-left p-2 text-content-secondary">Roles</th>
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
 <span key={r.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-brand/20 text-blue-800 text-blue-400">
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
 className="ml-1 text-brand hover:text-blue-800 hover:text-blue-300"
 title="Remove role"
 >×</button>
 </span>
 ))}
 </div>
 <select
 className="text-xs border border-outline-strong rounded p-1 bg-surface-elevated text-content-primary"
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
 className="ml-2 text-xs text-content-tertiary hover:text-content-primary"
 >Done</button>
 </div>
 ) : (
 <div className="flex items-center space-x-1">
 <span className="text-xs text-content-primary text-content-secondary">{roles.map(r => r.roleName).join(', ') || '-'}</span>
 <button
 onClick={() => setEditingRolesFor(u.id)}
 className="text-xs text-brand hover:text-blue-800 hover:text-blue-300"
 title="Edit roles"
 >✏️</button>
 </div>
 )}
 </td>
 <td className="p-2 text-right">
 <button
 onClick={() => setDeleteConfirm({show: true, userId: u.id, userName: u.name || u.email})}
 className="px-2 py-1 text-xs bg-red-600 dark:bg-red-700 text-white rounded hover:bg-red-700 hover:bg-red-600"
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
 <tr key={`allowlist-${e.id}`} className="border-t border-outline bg-surface-elevated/50">
 <td className="p-2 italic text-content-muted">Invited (not registered)</td>
 <td className="p-2 text-content-primary text-content-secondary">{e.pattern}</td>
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
 className="ml-1 text-brand hover:text-blue-800"
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
 className="ml-2 text-xs text-content-secondary hover:text-content-primary"
 >Done</button>
 </div>
 ) : (
 <div className="flex items-center space-x-1">
 <span className="text-xs">{roles.map(r => r.roleName).join(', ') || '-'}</span>
 <button
 onClick={() => setEditingRolesFor(pendingKey)}
 className="text-xs text-brand hover:text-blue-800"
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
 <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4 border border-outline">
 <h3 className="text-lg font-semibold mb-4 text-content-primary">Confirm Delete User</h3>
 <p className="mb-4 text-content-secondary">
 Are you sure you want to delete user <strong>{deleteConfirm.userName}</strong>? 
 This action cannot be undone.
 </p>
 <div className="flex justify-end space-x-3">
 <button
 onClick={() => setDeleteConfirm({show: false})}
 className="px-4 py-2 border border-outline-strong rounded bg-surface-elevated text-content-secondary hover:bg-surface-secondary"
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
 className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded hover:bg-red-700 hover:bg-red-600"
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
 <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4 border border-outline">
 <h3 className="text-lg font-semibold mb-4 text-content-primary">Confirm Delete Pattern</h3>
 <p className="mb-4 text-content-secondary">
 Are you sure you want to delete pattern <strong>{deleteAllowlistConfirm.pattern}</strong>? 
 This action cannot be undone.
 </p>
 <div className="flex justify-end space-x-3">
 <button
 onClick={() => setDeleteAllowlistConfirm({show: false})}
 className="px-4 py-2 border border-outline-strong rounded bg-surface-elevated text-content-secondary hover:bg-surface-secondary"
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
 className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded hover:bg-red-700 hover:bg-red-600"
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

