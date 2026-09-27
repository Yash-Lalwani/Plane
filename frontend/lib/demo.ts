// Static sample data for the landing page's product illustration only. The app itself uses the API.
export type Status = "TODO" | "IN_PROGRESS" | "DONE";

export type SampleTask = {
  id: string;
  title: string;
  status: Status;
  priority: "LOW" | "MEDIUM" | "HIGH";
  person: string;
  due: string;
};

export const statusLabels = { TODO: "To do", IN_PROGRESS: "In progress", DONE: "Done" };

export const initialTasks: SampleTask[] = (
  [
    ["Design the new homepage", "IN_PROGRESS", "HIGH", "Priya Shah", "Oct 02"],
    ["Build a reusable component library", "IN_PROGRESS", "HIGH", "Yash Lalwani", "Oct 04"],
    ["Review the onboarding flow", "IN_PROGRESS", "MEDIUM", "Alex Morgan", "Oct 05"],
    ["Write the product launch copy", "TODO", "MEDIUM", "Sam Wilson", "Oct 06"],
    ["Make the workspace responsive", "TODO", "HIGH", "Yash Lalwani", "Oct 07"],
    ["Prepare the launch checklist", "TODO", "LOW", "Alex Morgan", "Oct 09"],
    ["Set up project permissions", "DONE", "HIGH", "Yash Lalwani", "Sep 25"],
    ["Finalize the visual direction", "DONE", "MEDIUM", "Priya Shah", "Sep 26"],
    ["Organize research and project notes", "DONE", "LOW", "Sam Wilson", "Sep 27"],
  ] as const
).map(([title, status, priority, person, due], index) => ({
  id: `PLN-${String(index + 1).padStart(3, "0")}`,
  title,
  status,
  priority,
  person,
  due,
}));
