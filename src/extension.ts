// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
let startTime: Date | undefined;
let timer: NodeJS.Timeout | undefined;

function startLogging() {
  startTime = new Date();
  timer = setInterval(() => {
    let currentTime = new Date();
    let difference = currentTime.getTime() - (startTime?.getTime() || 0);
    vscode.window.showInformationMessage(
      `Working for ${Math.floor(difference / 1000)} seconds.`
    );
  }, 1000);
}

function stopLogging() {
  if (timer) clearInterval(timer);
  vscode.window.showInformationMessage("Stopped logging.");
  startTime = undefined;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

export function activate(context: vscode.ExtensionContext) {
  let startCommand = vscode.commands.registerCommand(
    "extension.startLogging",
    startLogging
  );
  let stopCommand = vscode.commands.registerCommand(
    "extension.stopLogging",
    stopLogging
  );
  context.subscriptions.push(startCommand, stopCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {}
