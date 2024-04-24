import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { JiraClientService } from "./jira";
import { promptForAuthToken, retrieveToken } from "./input-auth-data";
import { selectIssue } from "./select-issue";

let startTime: Date | undefined;
let timer: NodeJS.Timeout | undefined;
let taskName: string | undefined;
let statusBarItem: vscode.StatusBarItem;

export let jiraClientService: JiraClientService;

async function startLogging() {
  taskName = await selectIssue();
  if (!taskName || taskName.trim() === "") {
    vscode.window.showWarningMessage(
      "Task logging canceled due to no valid task name provided."
    );
    return;
  }
  startTime = new Date();
  statusBarItem.text = `$(timeline-view-icon) ${taskName}`;
  statusBarItem.show();
  vscode.window.showInformationMessage(
    `Started logging time for task: ${taskName}`
  );
  timer = setInterval(updateTimeMessage);
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
  statusBarItem.text = "No active task";
  statusBarItem.show();
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
    let hours = Math.floor(difference / 3600000);
    let minutes = Math.floor((difference % 3600000) / 60000);
    let seconds = Math.floor((difference % 60000) / 1000);
    statusBarItem.text = `$(timeline-view-icon) ${taskName}: ${hours}:${minutes}:${seconds}`;
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

    let workspaceRoot = getWorkspaceRootPath() || "";
    let outputFolderPath = path.join(workspaceRoot, "output");
    let logFilePath = path.join(outputFolderPath, "worklog.txt");

    if (!fs.existsSync(outputFolderPath)) {
      fs.mkdirSync(outputFolderPath);
    }

    const durationInSeconds = durationMS / 1000;
    if (durationInSeconds > 60) {
      jiraClientService.logWorkOnIssue(taskName, {
        comment: "Work logged from VS Code",
        started: startTime.toISOString().replace("Z", "+0000"),
        timeSpentSeconds: durationInSeconds,
      });
    }
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
        `Logged ${hours}h ${minutes}m ${seconds}s on ${taskName}`
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
    userToken = await promptForAuthToken(context);
  } else {
    userToken = await retrieveToken(context);
  }
  if (userToken) {
    jiraClientService = new JiraClientService(
      userToken,
      "https://helpdesk.applus-erp.com"
    );
    jiraClientService
      .initialize()
      .then(() => {
        console.log("Jira client service initialized.");
      })
      .catch((err) => {
        console.error(
          "Failed to initialize Jira client service: " + err.message
        );
        vscode.window.showErrorMessage(
          "Failed to initialize Jira client service: " + err.message
        );
      });
  }
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left
  );
  statusBarItem.text = "No active task";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
  console.log("Jira Work Logger extension is now active.");
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
