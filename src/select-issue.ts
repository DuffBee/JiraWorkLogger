import * as vscode from "vscode";
import { jiraClientService } from "./extension";
import { IJiraIssue } from "./jira";
export async function selectIssue(): Promise<string | undefined> {
  let issues: IJiraIssue[] = [];
  let quickPicks: string[] = [];
  const userEmailAddress = jiraClientService.getCurrentUser()?.emailAddress;
  if (userEmailAddress) {
    issues = await jiraClientService.getIssuesForUser(userEmailAddress);
  }
  if (issues.length !== 0) {
    quickPicks = issues.map((issue) => {
      return `${issue.key} - ${issue.fields.summary}`;
    });
  }
  const pick = await vscode.window.showQuickPick(quickPicks, {
    placeHolder: "Select an issue to log time",
  });

  return pick?.substring(0, pick.indexOf(" - "));
}
