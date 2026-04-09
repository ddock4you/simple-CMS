import type { User, Role } from '@simple-cms/db';

export type SessionUser = Omit<User, 'password'> & {
  role: Role | null;
};
