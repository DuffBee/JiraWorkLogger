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
  };
}

interface IJiraIssueResponse {
  total: number;
  issues: IJiraIssue[];
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
    return (await response.json()) as IJiraUser;
  }

  async getIssuesForUser(emailAddress: string): Promise<IJiraIssue[]> {
    const response: Response = await fetch(
      `${this.jiraBaseUrl}/rest/api/2/search?jql=assignee="${emailAddress}"`,
      {
        headers: {
          Authorization: `Bearer ${this.personalAccessToken}`,
        },
      }
    );
    const data: IJiraIssueResponse =
      (await response.json()) as IJiraIssueResponse;
    return data.issues;
  }

  getCurrentUser(): IJiraUser | undefined {
    return this.currentUser;
  }
}
