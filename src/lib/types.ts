// lib/types.ts
export type ID = string;

export type Role = 'admin' | 'staff' | 'student';

export type User = {
  // ใช้ unknown เพื่อรองรับคีย์เสริม โดยไม่ชนกับพร็อพชนิดอื่น
  [key: string]: unknown;

  id: ID;
  fullName: string;
  studentId: string;      // 11 หลัก
  email: string;
  major: string;
  faculty: string;
  year: number;
  groups: ID[];
  active: boolean;
  role: Role;
  password?: string;
  createdAt: string;
};

export type Group = {
  id: ID;
  name: string;
  description?: string;
  tokenLimit: number;
  members: ID[];
  createdAt: string;
  updatedAt: string;
};

export type Ban = {
  id: ID;
  userId: ID;
  groupId?: ID;
  reason?: string;
  startAt: string;
  endAt?: string;
  createdBy: ID;
};

export type UIPolicy = {
  id: string;
  name: string;
  detail?: string | null;
  tokenLimit: number;
  fileLimit: number;
  fileSizeLimit: number;
  share: boolean;
};

export type UIUser = {
  id: string;
  email: string;
  firstname?: string | null;
  lastname?: string | null;
  fullName: string;
  isActive: boolean;
  policyId?: string | null;
  departmentId?: string | null;
};

export type UIBan = {
  id: string;
  userId: string;
  groupId?: string | null;
  reason?: string | null;
  startAt: string;
  endAt?: string | null;
};
