import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { JiraClientService } from "./jira";
import { promptForAuthToken, retrieveToken } from "./input-auth-data";

let startTime: Date | undefined;
let timer: NodeJS.Timeout | undefined;
let taskName: string | undefined;

export let jiraClientService: JiraClientService;

async function startLogging() {
  taskName = await vscode.window.showInputBox({
    prompt: "What task are you working on?",
  });
  if (!taskName || taskName.trim() === "") {
    vscode.window.showWarningMessage(
      "Task logging canceled due to no valid task name provided."
    );
    return;
  }
  startTime = new Date();
  vscode.window.showInformationMessage(
    `Started logging time for task: ${taskName}`
  );
  timer = setInterval(updateTimeMessage, 60000);
}

function stopLogging() {
  if (timer) {
    clearInterval(timer);
    timer = undefined;
  }
  if (startTime && taskName) {
    logHours();
  } else {
    vscode.window.showInformationMessage("No active task to log.");
  }
  resetLoggingState();
}

function getWorkspaceRootPath(): string | undefined {
  if (
    vscode.workspace.workspaceFolders &&
    vscode.workspace.workspaceFolders.length > 0
  ) {
    return vscode.workspace.workspaceFolders[0].uri.fsPath;
  }
  return undefined;
}

function updateTimeMessage() {
  if (startTime && taskName) {
    let currentTime = new Date();
    let difference = currentTime.getTime() - startTime.getTime();
    let minutes = Math.floor(difference / 60000);
    let seconds = Math.floor((difference % 60000) / 1000);
    vscode.window.showInformationMessage(
      `Working on ${taskName} for ${minutes} minutes and ${seconds} seconds.`
    );
  }
}

function logHours() {
  if (startTime && taskName) {
    let endTime = new Date();
    let durationMS = endTime.getTime() - startTime.getTime();
    let hours = Math.floor(durationMS / 3600000);
    let minutes = Math.floor((durationMS % 3600000) / 60000);
    let seconds = Math.floor((durationMS % 60000) / 1000);
    let logEntry = `${endTime.toLocaleDateString()} - ${taskName} - ${hours}h ${minutes}m ${seconds}s\n`;
    let logFilePath = path.join(getWorkspaceRootPath() || "", "worklog.txt");
    try {
      let existingData = fs.existsSync(logFilePath)
        ? fs.readFileSync(logFilePath, "utf-8")
        : "";
      let updated = false;
      let newData = existingData
        .split("\n")
        .map((line) => {
          if (
            line.includes(endTime.toLocaleDateString()) &&
            line.includes(taskName as string)
          ) {
            let parts = line.split(" - ");
            let timeParts = parts[2].split(" ");
            let totalHours = parseInt(timeParts[0].slice(0, -1)) + hours;
            let totalMinutes = parseInt(timeParts[1].slice(0, -1)) + minutes;
            let totalSeconds = parseInt(timeParts[2].slice(0, -1)) + seconds;
            parts[2] = `${totalHours}h ${totalMinutes}m ${totalSeconds}s`;
            updated = true;
            return parts.join(" - ");
          }
          return line;
        })
        .join("\n");
      if (!updated) {
        newData += logEntry;
      }
      fs.writeFileSync(logFilePath, newData);
      vscode.window.showInformationMessage(
        `Logged ${hours}h ${minutes}m ${seconds}s on ${taskName}. Details saved to worklog.txt`
      );
    } catch (err) {
      if (err instanceof Error) {
        vscode.window.showErrorMessage("Failed to log time: " + err.message);
      } else {
        vscode.window.showErrorMessage(
          "Failed to log time due to an unknown error"
        );
      }
    }
  } else {
    vscode.window.showInformationMessage("No active task to log.");
  }
}

function resetLoggingState() {
  startTime = undefined;
  taskName = undefined;
}

export async function activate(context: vscode.ExtensionContext) {
  let startCommand = vscode.commands.registerCommand(
    "jira-work-logger.startLogging",
    startLogging
  );
  let stopCommand = vscode.commands.registerCommand(
    "jira-work-logger.stopLogging",
    stopLogging
  );
  context.subscriptions.push(startCommand, stopCommand);
  const secrets: vscode.SecretStorage = context.secrets;

  let userToken = await secrets.get("jiraAuthToken");
  if (!userToken) {
    promptForAuthToken(context);
  } else {
    const userAuthToken = await retrieveToken(context);

    console.log("JiraAuthToken", userToken);
    if (userAuthToken) {
      console.log("User Auth Token", userAuthToken);
    }
  }

  jiraClientService = new JiraClientService(
    "",
    "https://helpdesk.applus-erp.com"
  );
  jiraClientService
    .initialize()
    .then(() => {
      console.log("Jira client service initialized.");
    })
    .catch((err) => {
      console.error("Failed to initialize Jira client service: " + err.message);
      vscode.window.showErrorMessage(
        "Failed to initialize Jira client service: " + err.message
      );
    });
}

export function deactivate() {
  if (timer) {
    clearInterval(timer);
    if (startTime && taskName) {
      logHours();
    }
    resetLoggingState();
  }
}
