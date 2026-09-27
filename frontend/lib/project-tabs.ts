// Shared by the server page (to validate ?tab=) and the client workspace.
export const PROJECT_TAB_IDS = ["overview", "tasks", "notes", "members", "activity"] as const;
export type ProjectTab = (typeof PROJECT_TAB_IDS)[number];

export const isProjectTab = (value: string | undefined): value is ProjectTab =>
  PROJECT_TAB_IDS.some((id) => id === value);
