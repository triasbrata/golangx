import * as vscode from "vscode";
import * as fs from "fs";
import {
  checkMockery,
  execShell,
  genMockery,
  getFilePath,
  getInterfaces,
  installMockery,
} from "./utils";
import { INSTALL_CMD } from "./constant";

export const generateMockCmd = vscode.commands.registerCommand(
  "golangx.mockGen",
  async (uri: vscode.Uri) => {
    const mockeryBinPath = "$GOPATH/bin/mockery";
    var text = fs.readFileSync(uri.fsPath);
    const interfaces = getInterfaces(text.toString());
    const wsedit = new vscode.WorkspaceEdit();
    if (interfaces && interfaces.length > 0) {
      const path = getFilePath(uri);
      for (const i of interfaces) {
        const filename = `mock_${i}.go`;
        const newFile = vscode.Uri.file(path + filename);
        const args = "--inpackage";
        let mockContent: string | null = null;
        //check if mockery is installed
        try {
          await checkMockery(mockeryBinPath);
        } catch (error) {
          const option = await vscode.window.showErrorMessage(
            "mockery not found, you want install?",
            "install",
            "no"
          );
          if (option === "install") {
            await installMockery();
          } else {
            vscode.window.showErrorMessage(
              "install mockery with this command for use this feature \n " +
                INSTALL_CMD
            );
          }
          return;
        }
        try {
          mockContent = await genMockery(path, i, args, mockeryBinPath);
        } catch (error) {
          const rawMsg = (error as Error).message;
          const msgSplitted = rawMsg.split(new RegExp("\n", "gm"));
          console.log({ msgSplitted });
          const msgIndex = msgSplitted.findIndex((it) => it.includes(" ERR "));
          if (msgIndex !== -1) {
            vscode.window.showErrorMessage(
              [
                `Error generate mock interface ${i} because :`,
                msgSplitted[msgIndex],
              ].join("\n")
            );
          }
        }
        if (mockContent !== null) {
          wsedit.createFile(newFile, { ignoreIfExists: true, overwrite: true });
          wsedit.insert(newFile, new vscode.Position(0, 0), mockContent);
          const message = `golangx update file ${filename}`;
          vscode.window.showInformationMessage(message);
        } else {
          vscode.window.showInformationMessage(`failed generate mock ${i}`);
        }
      }
      vscode.workspace.applyEdit(wsedit);
    }
  }
);
