"use client";

import { useState } from "react";

import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import {
  Badge,
  Button,
  Card,
  ErrorMessage,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { useMutation, useQuery } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/dates";
import type { Role, RoleName, User } from "@/types";

interface NewUserForm {
  full_name: string;
  email: string;
  job_title: string;
  password: string;
  role_name: RoleName;
}

const emptyForm: NewUserForm = {
  full_name: "",
  email: "",
  job_title: "",
  password: "",
  role_name: "MEMBER",
};

const roleTone: Record<RoleName, "red" | "blue" | "slate"> = {
  ADMIN: "red",
  MANAGER: "blue",
  MEMBER: "slate",
};

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<NewUserForm>(emptyForm);

  const { data: users, loading, error, refetch } = useQuery<User[]>(
    "/users?include_inactive=true",
  );
  const { data: roles } = useQuery<Role[]>("/users/roles");

  const create = useMutation((payload: NewUserForm) =>
    api.post<User>("/users", {
      full_name: payload.full_name,
      email: payload.email,
      job_title: payload.job_title || null,
      password: payload.password,
      role_name: payload.role_name,
    }),
  );

  const update = useMutation(
    ({ id, ...body }: { id: number; role_id?: number; is_active?: boolean }) =>
      api.patch<User>(`/users/${id}`, body),
  );

  const deactivate = useMutation((id: number) => api.delete(`/users/${id}`));

  async function handleCreate() {
    try {
      await create.mutate(form);
      setForm(emptyForm);
      setCreating(false);
      refetch();
    } catch {
      // useMutation holds the error
    }
  }

  async function changeRole(user: User, roleId: number) {
    try {
      await update.mutate({ id: user.id, role_id: roleId });
      refetch();
    } catch {
      // surfaced below
    }
  }

  async function handleDeactivate(user: User) {
    if (!confirm(`Deactivate ${user.full_name}? They will no longer be able to sign in.`))
      return;
    try {
      await deactivate.mutate(user.id);
      refetch();
    } catch {
      // surfaced below
    }
  }

  return (
    <ProtectedRoute require="admin">
      <PageHeader
        title="User management"
        description="Add team members and assign roles"
        actions={
          !creating ? (
            <Button onClick={() => setCreating(true)}>Add user</Button>
          ) : undefined
        }
      />

      {(update.error || deactivate.error) && (
        <div className="mb-5">
          <ErrorMessage message={update.error ?? deactivate.error!} />
        </div>
      )}

      {creating && (
        <Card title="New user" className="mb-5">
          <div className="space-y-4">
            {create.error && <ErrorMessage message={create.error} />}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" required error={create.fieldErrors.full_name}>
                <Input
                  value={form.full_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, full_name: e.target.value }))
                  }
                  placeholder="Jane Perera"
                  invalid={Boolean(create.fieldErrors.full_name)}
                />
              </Field>

              <Field label="Email" required error={create.fieldErrors.email}>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="jane@example.com"
                  invalid={Boolean(create.fieldErrors.email)}
                />
              </Field>

              <Field label="Job title">
                <Input
                  value={form.job_title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, job_title: e.target.value }))
                  }
                  placeholder="Software Engineer"
                />
              </Field>

              <Field label="Role" required>
                <Select
                  value={form.role_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, role_name: e.target.value as RoleName }))
                  }
                >
                  <option value="MEMBER">Team member</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </Select>
              </Field>

              <Field
                label="Temporary password"
                required
                hint="At least 8 characters. Share it securely and ask them to change it."
                error={create.fieldErrors.password}
              >
                <Input
                  type="text"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  invalid={Boolean(create.fieldErrors.password)}
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setCreating(false);
                  setForm(emptyForm);
                  create.reset();
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} loading={create.loading}>
                Create user
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card title={users ? `${users.length} users` : "Users"}>
        {loading && <Spinner label="Loading users" />}
        {error && <ErrorMessage message={error} />}

        {users && (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Joined</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = user.id === currentUser?.id;
                return (
                  <tr
                    key={user.id}
                    className={user.is_active ? "hover:bg-slate-50" : "opacity-60"}
                  >
                    <Td>
                      <span className="font-medium text-slate-900">
                        {user.full_name}
                      </span>
                      {isSelf && <span className="ml-2 text-xs text-slate-400">you</span>}
                      {user.job_title && (
                        <p className="text-xs text-slate-500">{user.job_title}</p>
                      )}
                      {!user.is_active && (
                        <div className="mt-1">
                          <Badge tone="red">Deactivated</Badge>
                        </div>
                      )}
                    </Td>
                    <Td className="text-slate-600">{user.email}</Td>
                    <Td>
                      {isSelf ? (
                        <Badge tone={roleTone[user.role.name]}>
                          {user.role.name.toLowerCase()}
                        </Badge>
                      ) : (
                        <Select
                          value={user.role.id}
                          onChange={(e) => changeRole(user, Number(e.target.value))}
                          className="w-36"
                          disabled={!user.is_active}
                        >
                          {roles?.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name.charAt(0) + role.name.slice(1).toLowerCase()}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Td>
                    <Td className="text-slate-500">{formatDate(user.created_at)}</Td>
                    <Td className="text-right">
                      {!isSelf &&
                        (user.is_active ? (
                          <Button
                            variant="ghost"
                            onClick={() => handleDeactivate(user)}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            onClick={async () => {
                              await update.mutate({ id: user.id, is_active: true });
                              refetch();
                            }}
                          >
                            Reactivate
                          </Button>
                        ))}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </ProtectedRoute>
  );
}