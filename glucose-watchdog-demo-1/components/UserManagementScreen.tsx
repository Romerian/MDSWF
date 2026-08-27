"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatLongDate, formatTime } from "@/lib/business";
import { loadUsers, saveUsers } from "@/lib/storage";
import type { UserAccount, UserType } from "@/lib/types";
import { addUser, deleteUsers, editUser, selectUserIds, sortUsers, type SortDirection, type UserSortField } from "@/lib/users";
import { BulldogIcon } from "./BulldogIcon";

type EditorMode = "add" | "edit";

interface UserDraft {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  userType: UserType;
}

const emptyDraft: UserDraft = {
  username: "",
  password: "",
  firstName: "",
  lastName: "",
  userType: "User"
};

function DialogFrame({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="user-dialog-title">
      <div className="modal-heading"><h2 id="user-dialog-title">{title}</h2><button ref={closeRef} className="close-button" onClick={onClose} aria-label="Close dialog">×</button></div>
      {children}
    </section>
  </div>;
}

function formatLastLogin(timestamp: string | null): string {
  return timestamp ? `${formatLongDate(timestamp)} · ${formatTime(timestamp)}` : "Never";
}

export function UserManagementScreen({
  currentUserId,
  onReturn,
  onCurrentUserChanged
}: {
  currentUserId: string;
  onReturn: () => void;
  onCurrentUserChanged: (user: UserAccount | null) => void;
}) {
  const [users, setUsers] = useState<UserAccount[]>(() => loadUsers());
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<UserSortField>("username");
  const [sortDirection, setSortDirection] = useState<SortDirection>("ascending");
  const [editorMode, setEditorMode] = useState<EditorMode | null>(null);
  const [draft, setDraft] = useState<UserDraft>(emptyDraft);
  const [pendingAddition, setPendingAddition] = useState<UserAccount | null>(null);
  const [deleteSelection, setDeleteSelection] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortedUsers = useMemo(() => sortUsers(users, sortField, sortDirection), [users, sortField, sortDirection]);
  const selectedUser = selectedUserIds.length === 1 ? users.find(user => user.id === selectedUserIds[0]) ?? null : null;

  function persist(nextUsers: UserAccount[]) {
    saveUsers(nextUsers);
    setUsers(nextUsers);
  }

  function changeSort(field: UserSortField) {
    if (field === sortField) setSortDirection(value => value === "ascending" ? "descending" : "ascending");
    else {
      setSortField(field);
      setSortDirection("ascending");
    }
  }

  function sortIndicator(field: UserSortField) {
    if (field !== sortField) return "";
    return sortDirection === "ascending" ? " ↑" : " ↓";
  }

  function openAdd() {
    setError(null);
    setDraft(emptyDraft);
    setEditorMode("add");
  }

  function openEdit() {
    if (!selectedUser) return;
    setError(null);
    setDraft({
      username: selectedUser.username,
      password: selectedUser.password,
      firstName: selectedUser.firstName,
      lastName: selectedUser.lastName,
      userType: selectedUser.userType
    });
    setEditorMode("edit");
  }

  function submitEditor(event: React.FormEvent) {
    event.preventDefault();
    const candidate: UserAccount = {
      id: editorMode === "edit" && selectedUser ? selectedUser.id : `user-${crypto.randomUUID()}`,
      username: draft.username,
      password: draft.password,
      firstName: draft.firstName,
      lastName: draft.lastName,
      userType: draft.userType,
      lastLoginAt: editorMode === "edit" && selectedUser ? selectedUser.lastLoginAt : null
    };
    try {
      if (editorMode === "add") {
        addUser(users, candidate);
        setPendingAddition(candidate);
        setEditorMode(null);
      } else {
        const updated = editUser(users, candidate);
        persist(updated);
        setEditorMode(null);
        if (candidate.id === currentUserId) onCurrentUserChanged(candidate);
      }
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The user could not be saved.");
    }
  }

  function confirmAddition() {
    if (!pendingAddition) return;
    try {
      const updated = addUser(users, pendingAddition);
      persist(updated);
      setSelectedUserIds([pendingAddition.id]);
      setPendingAddition(null);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The user could not be added.");
    }
  }

  function confirmDeletion() {
    if (!deleteSelection) return;
    try {
      const updated = deleteUsers(users, deleteSelection);
      persist(updated);
      const deletedCurrentUser = deleteSelection.includes(currentUserId);
      setSelectedUserIds([]);
      setDeleteSelection(null);
      setError(null);
      if (deletedCurrentUser) onCurrentUserChanged(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The selected users could not be deleted.");
      setDeleteSelection(null);
    }
  }

  function selectUser(userId: string, multiple: boolean) {
    setSelectedUserIds(selected => selectUserIds(selected, userId, multiple));
  }

  const deletionUsers = deleteSelection ? users.filter(user => deleteSelection.includes(user.id)) : [];

  return <main className="app-shell user-management-shell">
    <header className="app-header">
      <button className="brand brand-button" onClick={onReturn} aria-label="Glucose Watchdog main screen"><BulldogIcon /><span>Glucose Watchdog</span></button>
      <nav className="header-actions" aria-label="User management actions">
        <button className="button secondary" onClick={openAdd}>Add User</button>
        <button className="button secondary" onClick={openEdit} disabled={!selectedUser}>Edit User</button>
        <button className="button danger" onClick={() => selectedUser && setDeleteSelection([selectedUser.id])} disabled={!selectedUser}>Delete User</button>
        <button className="button danger" onClick={() => setDeleteSelection(selectedUserIds)} disabled={selectedUserIds.length < 2}>Delete Selected ({selectedUserIds.length})</button>
      </nav>
    </header>

    <section className="page-heading">
      <p className="eyebrow">Administrator access</p>
      <h1>User Management</h1>
      <p>Click a user to select it. Hold Ctrl while clicking to select more than one.</p>
    </section>

    {error && <p className="user-management-error form-error" role="alert">{error}</p>}

    <section className="panel user-management-panel" aria-labelledby="user-list-heading">
      <div className="panel-heading compact"><h2 id="user-list-heading">User List</h2><span>{users.length}</span></div>
      <div className="table-wrap">
        <table className="user-table">
          <thead><tr>
            <th scope="col"><button onClick={() => changeSort("username")}>Username{sortIndicator("username")}</button></th>
            <th scope="col"><button onClick={() => changeSort("firstName")}>First Name{sortIndicator("firstName")}</button></th>
            <th scope="col"><button onClick={() => changeSort("lastName")}>Last Name{sortIndicator("lastName")}</button></th>
            <th scope="col"><button onClick={() => changeSort("userType")}>User Type{sortIndicator("userType")}</button></th>
            <th scope="col"><button onClick={() => changeSort("lastLoginAt")}>Last Login{sortIndicator("lastLoginAt")}</button></th>
          </tr></thead>
          <tbody>{sortedUsers.map(user => <tr
            key={user.id}
            className={selectedUserIds.includes(user.id) ? "selected-user" : ""}
            aria-selected={selectedUserIds.includes(user.id)}
            tabIndex={0}
            onClick={event => selectUser(user.id, event.ctrlKey)}
            onKeyDown={event => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                selectUser(user.id, event.ctrlKey);
              }
            }}
          >
            <td>{user.username}</td><td>{user.firstName}</td><td>{user.lastName}</td><td>{user.userType}</td><td>{formatLastLogin(user.lastLoginAt)}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>

    {editorMode && <DialogFrame title={editorMode === "add" ? "Add User" : "Edit User"} onClose={() => { setEditorMode(null); setError(null); }}>
      <form className="entry-form" onSubmit={submitEditor}>
        <label>Username<input autoFocus value={draft.username} onChange={event => setDraft(value => ({ ...value, username: event.target.value }))} required /></label>
        <label>Password<input type="password" value={draft.password} onChange={event => setDraft(value => ({ ...value, password: event.target.value }))} required /></label>
        <div className="field-row">
          <label>First Name<input value={draft.firstName} onChange={event => setDraft(value => ({ ...value, firstName: event.target.value }))} required /></label>
          <label>Last Name<input value={draft.lastName} onChange={event => setDraft(value => ({ ...value, lastName: event.target.value }))} required /></label>
        </div>
        <label>User Type<select value={draft.userType} onChange={event => setDraft(value => ({ ...value, userType: event.target.value as UserType }))}><option>Administrator</option><option>User</option></select></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions"><button type="button" className="button secondary" onClick={() => { setEditorMode(null); setError(null); }}>Cancel</button><button type="submit" className="button primary">{editorMode === "add" ? "Review User" : "Save Changes"}</button></div>
      </form>
    </DialogFrame>}

    {pendingAddition && <DialogFrame title="Confirm New User" onClose={() => { setPendingAddition(null); setError(null); }}>
      <p>Confirm the following information before adding this user.</p>
      <dl className="entry-details">
        <div><dt>Username</dt><dd>{pendingAddition.username}</dd></div><div><dt>First Name</dt><dd>{pendingAddition.firstName}</dd></div>
        <div><dt>Last Name</dt><dd>{pendingAddition.lastName}</dd></div><div><dt>User Type</dt><dd>{pendingAddition.userType}</dd></div>
      </dl>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button className="button secondary" onClick={() => { setPendingAddition(null); setError(null); }}>Cancel</button><button className="button primary" onClick={confirmAddition}>Confirm and Add</button></div>
    </DialogFrame>}

    {deleteSelection && <DialogFrame title={deleteSelection.length > 1 ? "Delete Users" : "Delete User"} onClose={() => { setDeleteSelection(null); setError(null); }}>
      <p className="permanent-warning"><strong>Warning:</strong> This deletion is permanent.</p>
      <p>{deleteSelection.length > 1 ? "The following users will be deleted:" : "The following user will be deleted:"}</p>
      <ul>{deletionUsers.map(user => <li key={user.id}>{user.username} — {user.firstName} {user.lastName}</li>)}</ul>
      <div className="form-actions"><button className="button secondary" onClick={() => { setDeleteSelection(null); setError(null); }}>Cancel</button><button className="button danger" onClick={confirmDeletion}>Acknowledge and Delete</button></div>
    </DialogFrame>}
  </main>;
}
