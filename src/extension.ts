// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import path = require("path");
import { generateInterfaceCmd } from "./generate-interface";
import { generateMockCmd } from "./generate-mock";

export function activate(context: vscode.ExtensionContext) {
  console.log("extension now run");
  context.subscriptions.push(generateMockCmd);
  context.subscriptions.push(generateInterfaceCmd);
}

// this method is called when your extension is deactivated
export function deactivate() {}
