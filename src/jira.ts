import * as vscode from "vscode";

export interface IJiraUser {
  key: string;
  name: string;
  emailAddress: string;
  displayName: string;
}

export interface IJiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description: string;
    issuetype: {
            subtask: boolean;
        };
  };
}

interface IJiraIssueResponse {
  total: number;
  issues: IJiraIssue[];
}

export interface IJiraWorklog {
  comment: string;
  started: string;
  timeSpentSeconds: number;
}

export class JiraClientService {
  personalAccessToken: string;
  jiraBaseUrl: string = "https://jira.atlassian.com";

  currentUser: IJiraUser | undefined;

  constructor(personalAccessToken: string, jiraBaseUrl: string) {
    this.personalAccessToken = personalAccessToken;
    this.jiraBaseUrl = jiraBaseUrl;
  }

  async initialize() {
    this.currentUser = await this.getUserInformation();
  }

  async getUserInformation(): Promise<IJiraUser> {
    const response: Response = await fetch(
      `${this.jiraBaseUrl}/rest/api/2/myself`,
      {
        headers: {
          Authorization: `Bearer ${this.personalAccessToken}`,
        },
      }
    );
    if (!response.ok) {
      vscode.window.showErrorMessage(`Failed to get user information`);
      throw new Error(`Failed to get user information`);
    }
    return (await response.json()) as IJiraUser;
  }

  async getIssuesForUser(emailAddress: string): Promise<IJiraIssue[]> {
    const jql = encodeURIComponent(
      `assignee = "${emailAddress}" AND status NOT IN (Done, Closed, Integrated, Canceled)`
    );
    const response: Response = await fetch(
      `${this.jiraBaseUrl}/rest/api/2/search?jql=${jql}`,
      {
        headers: {
          Authorization: `Bearer ${this.personalAccessToken}`,
        },
      }
    );
    if (!response.ok) {
      vscode.window.showErrorMessage(
        `Failed to get issues for user ${emailAddress}`
      );
      throw new Error(`Failed to get issues for user ${emailAddress}`);
    }
    const data: IJiraIssueResponse =
      (await response.json()) as IJiraIssueResponse;
    const subtasks = data.issues.filter(issue => issue.fields.issuetype.subtask);
    return subtasks;
  }

  getCurrentUser(): IJiraUser | undefined {
    return this.currentUser;
  }

  async logWorkOnIssue(issueKey: string, workLog: IJiraWorklog) {
    console.log(JSON.stringify(workLog));
    const response: Response = await fetch(
      `${this.jiraBaseUrl}/rest/api/2/issue/${issueKey}/worklog`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.personalAccessToken}`,
        },
        body: JSON.stringify(workLog),
      }
    );
    if (!response.ok) {
      console.log(await response.json());
      vscode.window.showErrorMessage(`Failed to log work on issue ${issueKey}`);
      throw new Error(`Failed to log work on issue ${issueKey}`);
    }
  }
}
