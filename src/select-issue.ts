import * as vscode from "vscode";
import { fetchAssignedIssues } from "./service";
export async function selectIssue() {
  const issues = await fetchAssignedIssues();
  const pick = await vscode.window.showQuickPick(issues, {
    placeHolder: "Select an issue to log time",
  });

  if (pick) {
    vscode.window.showInformationMessage(`Selected Issue: ${pick.label}`);
    return pick.issueId;
  }
  return null;
}
