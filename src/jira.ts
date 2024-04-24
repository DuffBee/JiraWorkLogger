export interface IJiraUser {
  key: string;
  name: string;
  emailAddress: string;
  displayName: string;
}

export class JiraClientService {
  personalAccessToken: string;
  jiraBaseUrl: string = "https://jira.atlassian.com";

  constructor(personalAccessToken: string, jiraBaseUrl: string) {
    this.personalAccessToken = personalAccessToken;
    this.jiraBaseUrl = jiraBaseUrl;
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
}
