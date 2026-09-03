const FULL_ACCESS = { C: 1, R: 1, U: 1, D: 1 } as const;
const CREATE_READ_UPDATE = { C: 1, R: 1, U: 1, D: 0 } as const;
const READ_UPDATE = { C: 0, R: 1, U: 1, D: 0 } as const;
const READ_DELETE = { C: 0, R: 1, U: 0, D: 1 } as const;
const READ_ONLY = { C: 0, R: 1, U: 0, D: 0 } as const;
const NO_ACCESS = { C: 0, R: 0, U: 0, D: 0 } as const;

export const DEVELOPER_ROLE = {
  workspace: FULL_ACCESS,
  user: FULL_ACCESS,
  brand: FULL_ACCESS,
  guideline: FULL_ACCESS,
  settings: FULL_ACCESS,
} as const;

export const OWNER = {
  workspace: FULL_ACCESS,
  user: FULL_ACCESS,
  brand: FULL_ACCESS,
  guideline: FULL_ACCESS,
  settings: FULL_ACCESS,
} as const;

export const ADMIN_ROLE = {
  workspace: READ_UPDATE,
  user: READ_DELETE,
  brand: FULL_ACCESS,
  guideline: FULL_ACCESS,
  settings: FULL_ACCESS,
} as const;

export const MANAGER_ROLE = {
  workspace: READ_ONLY,
  user: READ_ONLY,
  brand: READ_UPDATE,
  guideline: CREATE_READ_UPDATE,
  settings: READ_ONLY,
} as const;

export const USER_ROLE = {
  workspace: READ_ONLY,
  user: NO_ACCESS,
  brand: READ_ONLY,
  guideline: READ_ONLY,
  settings: NO_ACCESS,
} as const;

export const VISITOR_ROLE = {
  workspace: READ_ONLY,
  user: NO_ACCESS,
  brand: READ_ONLY,
  guideline: READ_ONLY,
  settings: NO_ACCESS,
} as const;

export enum IUserType {
  Developer = 1 << 0, // 1
  Owner = 1 << 1, // 2
  Admin = 1 << 2, // 4
  Manager = 1 << 3, // 8
  User = 1 << 4, // 16
  Visitor = 1 << 5, // 32
}

type CRUD = { C: 0 | 1; R: 0 | 1; U: 0 | 1; D: 0 | 1 };

// Permissions can be any key (module name) with a CRUD object
type Permissions = Record<string, CRUD>;

// Default role-permission map
export const ROLE_PERMISSIONS: Record<IUserType, Permissions> = {
  [IUserType.Developer]: DEVELOPER_ROLE,
  [IUserType.Owner]: OWNER,
  [IUserType.Admin]: ADMIN_ROLE,
  [IUserType.Manager]: MANAGER_ROLE,
  [IUserType.User]: USER_ROLE,
  [IUserType.Visitor]: VISITOR_ROLE,
};
