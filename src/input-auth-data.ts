import * as vscode from "vscode";

export async function promptForAuthToken(context: vscode.ExtensionContext) {
  const token = await vscode.window.showInputBox({
    prompt: "Enter your JIRA authentication token",
    ignoreFocusOut: true,
    password: true, // This masks the input
  });

  if (token) {
    await storeToken(token, context);
    vscode.window.showInformationMessage("Token stored securely!");
  } else {
    vscode.window.showErrorMessage(
      "Authentication token is required to use this extension."
    );
  }
}

export async function storeToken(
  token: string,
  context: vscode.ExtensionContext
) {
  const secrets = context.secrets;
  await secrets.store("jiraAuthToken", token);
}

export async function retrieveToken(
  context: vscode.ExtensionContext
): Promise<string | undefined> {
  const secrets = context.secrets;
  return await secrets.get("jiraAuthToken");
}
