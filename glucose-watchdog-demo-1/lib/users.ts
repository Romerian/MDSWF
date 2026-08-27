import type { UserAccount } from "./types.ts";

export type UserSortField = "username" | "firstName" | "lastName" | "userType" | "lastLoginAt";
export type SortDirection = "ascending" | "descending";

export function validateUser(users: UserAccount[], candidate: UserAccount): string | null {
  if (!candidate.username.trim() || !candidate.password || !candidate.firstName.trim() || !candidate.lastName.trim()) {
    return "Username, password, first name, last name, and user type are required.";
  }
  const duplicate = users.some(user => user.id !== candidate.id && user.username.toLocaleLowerCase() === candidate.username.trim().toLocaleLowerCase());
  if (duplicate) return "Username must be unique.";
  return null;
}

export function addUser(users: UserAccount[], candidate: UserAccount): UserAccount[] {
  const error = validateUser(users, candidate);
  if (error) throw new Error(error);
  return [...users, { ...candidate, username: candidate.username.trim(), firstName: candidate.firstName.trim(), lastName: candidate.lastName.trim() }];
}

export function editUser(users: UserAccount[], candidate: UserAccount): UserAccount[] {
  const error = validateUser(users, candidate);
  if (error) throw new Error(error);
  if (!users.some(user => user.id === candidate.id)) throw new Error("The selected user no longer exists.");
  const updated = users.map(user => user.id === candidate.id
    ? { ...candidate, username: candidate.username.trim(), firstName: candidate.firstName.trim(), lastName: candidate.lastName.trim() }
    : user);
  if (!updated.some(user => user.userType === "Administrator")) throw new Error("At least one administrator account is required.");
  return updated;
}

export function deleteUsers(users: UserAccount[], userIds: string[]): UserAccount[] {
  const selected = new Set(userIds);
  const updated = users.filter(user => !selected.has(user.id));
  if (!updated.some(user => user.userType === "Administrator")) throw new Error("At least one administrator account is required.");
  return updated;
}

export function sortUsers(users: UserAccount[], field: UserSortField, direction: SortDirection): UserAccount[] {
  const multiplier = direction === "ascending" ? 1 : -1;
  return [...users].sort((left, right) => {
    const leftValue = left[field] ?? "";
    const rightValue = right[field] ?? "";
    return String(leftValue).localeCompare(String(rightValue), undefined, { sensitivity: "base" }) * multiplier;
  });
}

export function selectUserIds(current: string[], userId: string, multiple: boolean): string[] {
  if (!multiple) return [userId];
  return current.includes(userId) ? current.filter(id => id !== userId) : [...current, userId];
}
