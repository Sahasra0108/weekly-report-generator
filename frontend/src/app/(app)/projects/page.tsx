"use client";

import { useState } from "react";

import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  Field,
  Input,
  PageHeader,
  Spinner,
  Table,
  Td,
  Textarea,
  Th,
} from "@/components/ui";
import { useMutation, useQuery } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/dates";
import type { Project, User } from "@/types";

const COLOURS = [
  "#2563eb",
  "#16a34a",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#dc2626",
  "#ca8a04",
  "#4f46e5",
];

interface FormState {
  name: string;
  description: string;
  color: string;
  member_ids: number[];
}

const emptyForm: FormState = {
  name: "",
  description: "",
  color: COLOURS[0],
  member_ids: [],
};

export default function ProjectsPage() {
  const { isAdmin } = useAuth();

  const [editing, setEditing] = useState<Project | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: projects, loading, error, refetch } = useQuery<Project[]>(
    "/projects?include_inactive=true",
  );
  const { data: users } = useQuery<User[]>("/users");

  const save = useMutation(async (payload: FormState & { id?: number }) => {
    const body = {
      name: payload.name,
      description: payload.description || null,
      color: payload.color,
      member_ids: payload.member_ids,
    };
    return payload.id
      ? api.patch<Project>(`/projects/${payload.id}`, body)
      : api.post<Project>("/projects", body);
  });

  const archive = useMutation((id: number) => api.delete(`/projects/${id}`));
  const restore = useMutation((id: number) =>
    api.patch<Project>(`/projects/${id}`, { is_active: true }),
  );

  const members = users?.filter((u) => u.role.name === "MEMBER") ?? [];
  const isOpen = creating || editing !== null;

  function startCreate() {
    setForm(emptyForm);
    setEditing(null);
    setCreating(true);
  }

  function startEdit(project: Project) {
    setForm({
      name: project.name,
      description: project.description ?? "",
      color: project.color ?? COLOURS[0],
      member_ids: project.members.map((m) => m.id),
    });
    setCreating(false);
    setEditing(project);
  }

  function close() {
    setCreating(false);
    setEditing(null);
    save.reset();
  }

  async function handleSave() {
    try {
      await save.mutate({ ...form, id: editing?.id });
      close();
      refetch();
    } catch {
      // useMutation holds the error
    }
  }

  async function handleArchive(project: Project) {
    if (!confirm(`Archive "${project.name}"? Existing reports keep referencing it.`))
      return;
    try {
      await archive.mutate(project.id);
      refetch();
    } catch {
      // handled below
    }
  }

  function toggleMember(id: number) {
    setForm((f) => ({
      ...f,
      member_ids: f.member_ids.includes(id)
        ? f.member_ids.filter((m) => m !== id)
        : [...f.member_ids, id],
    }));
  }

  return (
    <ProtectedRoute require="manager">
      <PageHeader
        title="Projects and categories"
        description="Work categories that reports can be tagged with"
        actions={
          !isOpen ? <Button onClick={startCreate}>Add project</Button> : undefined
        }
      />

      {(archive.error || restore.error) && (
        <div className="mb-5">
          <ErrorMessage message={archive.error ?? restore.error!} />
        </div>
      )}

      {isOpen && (
        <Card
          title={editing ? `Edit ${editing.name}` : "New project"}
          className="mb-5"
        >
          <div className="space-y-4">
            {save.error && <ErrorMessage message={save.error} />}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" required error={save.fieldErrors.name}>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Client A - Portal Rebuild"
                  invalid={Boolean(save.fieldErrors.name)}
                />
              </Field>

              <Field label="Colour" hint="Used in charts and report tags">
                <div className="flex flex-wrap gap-2 pt-1.5">
                  {COLOURS.map((colour) => (
                    <button
                      key={colour}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, color: colour }))}
                      className={`h-7 w-7 rounded-full transition-transform ${
                        form.color === colour
                          ? "scale-110 ring-2 ring-slate-400 ring-offset-2"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: colour }}
                      aria-label={`Colour ${colour}`}
                    />
                  ))}
                </div>
              </Field>
            </div>

            <Field label="Description">
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="What this project covers"
              />
            </Field>

            <Field
              label="Assigned team members"
              hint="Optional. Helps managers filter the dashboard."
            >
              <div className="flex flex-wrap gap-2 pt-1">
                {members.map((member) => {
                  const selected = form.member_ids.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleMember(member.id)}
                      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                        selected
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-300 text-slate-600 hover:border-slate-400"
                      }`}
                    >
                      {member.full_name}
                    </button>
                  );
                })}
              </div>
            </Field>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button onClick={handleSave} loading={save.loading}>
                {editing ? "Save changes" : "Create project"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card title={projects ? `${projects.length} projects` : "Projects"}>
        {loading && <Spinner label="Loading projects" />}
        {error && <ErrorMessage message={error} />}

        {projects && projects.length === 0 && (
          <EmptyState
            title="No projects yet"
            description="Add one so team members can tag their reports."
            action={<Button onClick={startCreate}>Add project</Button>}
          />
        )}

        {projects && projects.length > 0 && (
          <Table>
            <thead>
              <tr>
                <Th>Project</Th>
                <Th>Description</Th>
                <Th>Members</Th>
                <Th>Created</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr
                  key={project.id}
                  className={project.is_active ? "hover:bg-slate-50" : "opacity-60"}
                >
                  <Td>
                    <span className="inline-flex items-center gap-2">
                      {project.color && (
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                      )}
                      <span className="font-medium text-slate-900">{project.name}</span>
                      {!project.is_active && <Badge>Archived</Badge>}
                    </span>
                  </Td>
                  <Td className="max-w-xs text-slate-600">
                    {project.description || "—"}
                  </Td>
                  <Td className="text-slate-600">
                    {project.members.length > 0
                      ? project.members.map((m) => m.full_name.split(" ")[0]).join(", ")
                      : "—"}
                  </Td>
                  <Td className="text-slate-500">{formatDate(project.created_at)}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" onClick={() => startEdit(project)}>
                        Edit
                      </Button>
                      {isAdmin &&
                        (project.is_active ? (
                          <Button
                            variant="ghost"
                            onClick={() => handleArchive(project)}
                          >
                            Archive
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            onClick={async () => {
                              await restore.mutate(project.id);
                              refetch();
                            }}
                          >
                            Restore
                          </Button>
                        ))}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </ProtectedRoute>
  );
}