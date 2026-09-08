export type ResearchSubmitStatus = "idle" | "loading" | "success" | "error";

export function researchSubmitLabel(status: ResearchSubmitStatus): string {
  if (status === "loading") {
    return "Researching…";
  }
  if (status === "success") {
    return "Run new research";
  }
  return "Run research";
}
