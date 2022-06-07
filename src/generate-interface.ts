import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode";
import { deepStrictEqual } from "assert";
import { promisify } from "util";
import { basename, dirname, join } from "path";
import { execShell } from "./utils";
import { execSync } from "child_process";
import { snakeCase } from "change-case";
export const generateInterfaceCmd = vscode.commands.registerCommand(
  "golangx.implementGen",
  async (uri: vscode.Uri) => {
    try {
      //impl package
      const implBinPath = "$GOPATH/bin/impl";
      const goplsBinPath = "$GOPATH/bin/gopls";
      //get init path

      const interfaceCont = fs.readFileSync(uri.fsPath).toString();
      const gomodPaths = await vscode.workspace.findFiles("go.mod", "", 1);
      if ((gomodPaths?.length || 0) < 1) {
        vscode.window.showErrorMessage("go.mod not found");
        return;
      }
      const gomod = gomodPaths[0];
      const baseModule = fs
        .readFileSync(gomod.fsPath)
        .toString()
        .split("\n")
        .find((it) => it.startsWith("module"))
        ?.slice(7);
      if (!baseModule || (baseModule?.length || 0) < 1) {
        vscode.window.showErrorMessage("module not define in go.mod");
        return;
      }
      const interfaces = interfaceCont
        .match(/type ([a-zA-z]+) interface/g)
        ?.map((it) => it.replace(/(type|interface|\s)/g, ""))
        .filter((it) => it.length > 0);

      if (interfaces && interfaces.length > 0) {
        if (interfaces.length > 1) {
          vscode.window.showErrorMessage("cant handle 2 interface in 1 file");
          return;
        }
        console.log({ interfaceCont });
        const regExpPackageInterface = /^package\s(\w+)/.exec(interfaceCont);
        if (!regExpPackageInterface || regExpPackageInterface.length < 2) {
          vscode.window.showErrorMessage(
            `interface ${interfaces[0]} dont have package`
          );
          return;
        }
        const packageInterface = regExpPackageInterface[1];
        let rootPathInterface = "";
        for (const wpFolder of vscode.workspace.workspaceFolders!) {
          if (uri.path.includes(wpFolder.uri.path)) {
            rootPathInterface = uri.path.slice(wpFolder.uri.path.length);
            break;
          }
        }
        let pathPackInterface = join(baseModule, dirname(rootPathInterface));
        pathPackInterface = pathPackInterface.endsWith(packageInterface)
          ? pathPackInterface
          : join(baseModule, packageInterface);
        const interfaceName = interfaces[0];
        const structName = interfaceName.toLowerCase();
        const structType = `${structName[0]} *${structName}`;
        const implFolder = path.join(uri.fsPath, "..", "impl");
        if (fs.existsSync(implFolder)) {
          fs.mkdirSync(implFolder, {
            recursive: true,
          });
        }
        //create struct

        const wsedit = new vscode.WorkspaceEdit();
        const structFilePath = path.join(implFolder, "init.go");
        if (!fs.existsSync(structFilePath)) {
          const uriStruct = vscode.Uri.file(structFilePath);
          wsedit.createFile(uriStruct, {
            overwrite: true,
          });
          wsedit.insert(
            uriStruct,
            new vscode.Position(0, 0),
            structContent(
              structName,
              `intf.${interfaceName}`,
              pathPackInterface
            )
          );
        }
        const cmd = `cd ${dirname(
          uri.fsPath
        )} && ${implBinPath} "${structType}" ${interfaceName}`;
        //genereate impl
        console.log(cmd);
        const listImpl = execSync(cmd).toString();
        const methRegex = /func\s\(.*\)\s(\w+).*\n.*\n.*/gm;
        for (const [content, name] of listImpl.matchAll(methRegex)) {
          const uriImpMeth = vscode.Uri.file(
            join(implFolder, `${snakeCase(name)}.go`)
          );
          const exists = fs.existsSync(uriImpMeth.fsPath);
          if (!exists) {
            wsedit.createFile(uriImpMeth, {
              overwrite: true,
              ignoreIfExists: false,
            });
            wsedit.insert(
              uriImpMeth,
              new vscode.Position(0, 0),
              methodContent(content)
            );
          } else {
            fs.readFileSync(uriImpMeth.fsPath).toString();
          }
        }
        if (wsedit.entries().length > 0) {
          vscode.workspace.applyEdit(wsedit);
        }
      }
    } catch (error) {
      console.error(error);
    }
  }
);
function structContent(
  structName: string,
  interfaceName: string,
  interfaceModule: string
): string {
  return `package impl

import (
  intf "${interfaceModule}"
)

type ${structName} struct {

}
func New() ${interfaceName} {
  return &${structName}{}
}
  `;
}
function methodContent(content: string): string {
  return `package impl
  
${content}`;
}
