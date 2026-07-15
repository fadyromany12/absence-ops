/* The user shape that may leave the server: everything except credentials. */

export function publicUser(u: {
  id: string;
  name: string;
  email: string;
  role: string;
  empId: string | null;
  mustChange: boolean;
  createdAt: Date;
}) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    empId: u.empId,
    mustChange: u.mustChange,
    createdAt: u.createdAt.getTime(),
  };
}
