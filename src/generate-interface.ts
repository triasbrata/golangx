import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode";
import { deepStrictEqual } from "assert";
import { promisify } from "util";
import { basename, dirname, join } from "path";
import { execShell } from "./utils";
import { execSync } from "child_process";
import { snakeCase } from "change-case";
import lineColumn = require("line-column");
export const generateInterfaceCmd = vscode.commands.registerCommand(
  "golangx.implementGen",
  async (uri: vscode.Uri) => {
    try {
      //impl package
      const implBinPath = "$GOPATH/bin/impl";
      const goplsBinPath = "$GOPATH/bin/gopls";
      //get init path

      const textEditorInterface = await vscode.workspace.openTextDocument(uri);
      const interfaceCont = textEditorInterface.getText();
      const editor = await vscode.window.showTextDocument(
        textEditorInterface,
        1,
        true
      );
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
      const iname = Array.from(
        interfaceCont.matchAll(/^type ([\w\d]+) interface {(?:.*?|\n)*?}/gm)
      ).map(([, iName]) => iName);

      if (iname && iname.length > 0) {
        if (iname.length > 1) {
          vscode.window.showErrorMessage("cant handle 2 interface in 1 file");
          return;
        }
        console.log({ interfaceCont });
        const regExpPackageInterface = /^package\s(\w+)/.exec(interfaceCont);
        if (!regExpPackageInterface || regExpPackageInterface.length < 2) {
          vscode.window.showErrorMessage(
            `interface ${iname[0]} dont have package`
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
        const interfaceName = iname[0];
        const structName = interfaceName.toLowerCase();
        const structType = `${structName[0]} *${structName}`;
        const implFolder = path.join(uri.fsPath, "..", "impl");
        if (!fs.existsSync(implFolder)) {
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
        const regexMethodWantImpl = interfaceCont.matchAll(
          /^\s([\w\d]+)(\(([\s\w\d+\,\.]*)\))( (\(([\s\w\d+\,\.]*)\)|[\s\w\d]+))?/gm
        );
        //genereate impl
        const selections: vscode.Selection[] = [];
        for (const item of regexMethodWantImpl) {
          const [full, methodName, inFull, inOnly, _, outFull, outOnly] = item;
          const methodIndex = item.index!;
          const rangeStart = textEditorInterface.positionAt(methodIndex);
          const rangeEnd = textEditorInterface.positionAt(
            methodIndex + full.length
          );
          // selections.push(new vscode.Selection(rangeStart, rangeEnd));

          const inArgs = inOnly?.split(",").map((it) => it.trim());
          const inImport = inArgs
            ?.filter((it) => it.indexOf(".") != -1)
            .map((it) => {
              const [_, typeIn] = it.split(" ");
              return typeIn;
            });
          const outArgs = outOnly?.split(",").map((it) => it.trim());
          const outImport = outArgs
            ?.filter((it) => it.indexOf(".") != -1)
            .map((it) => {
              const [_, typeIn] = it.split(" ");
              return typeIn;
            });
          if (inImport.length > 0) {
            const paramIndex = full.indexOf(inOnly);
            console.log(full);
            for (const inImp of inImport) {
              const inImpIdx = inOnly.indexOf(inImp);
              const posStart = methodIndex + paramIndex + inImpIdx;
              const rangeStartParam = textEditorInterface.positionAt(posStart);
              const rangeEndParam = textEditorInterface.positionAt(
                posStart + inImp.length
              );
              selections.push(
                new vscode.Selection(rangeStartParam, rangeEndParam)
              );
            }
          }
        }
        editor.selections = selections;

        // const methRegex =
        //   /^func \([\w\s\d+\*]+\) ([\w\d]+)(\(([\s\w\d+\,\.]*)\))(\s\((.*)\)|\s[\w\d]+)? {\s.*\s}$/gm;
        // const methContent = Array.from(listImpl.matchAll(methRegex));
        // for (const mc of methContent) {
        //   console.log(mc.input?.indexOf(mc[2]), mc[2]);
        // }
        // console.log({ methContent });
        const listImpFile = fs.readdirSync(implFolder);
        const methodImplementeds = listImpFile.reduce(
          (methodImplemented, filename) => {
            const filePath = join(implFolder, filename);
            const methSymbols = execSync(
              `cd ${dirname(filePath)} && ${goplsBinPath} symbols ${filename}`
            )
              .toString()
              .matchAll(/.*\.(.*) Method \d+:\d+-\d+:\d+$/gm);
            return [
              ...methodImplemented,
              ...Array.from(methSymbols).map(([, methodName]) => methodName),
            ];
          },
          [] as string[]
        );
        // for (const [content, name] of [[]]) {
        //   if (methodImplementeds.includes(name)) {
        //     continue;
        //   }
        //   const uriImpMeth = vscode.Uri.file(
        //     join(implFolder, `${snakeCase(name)}.go`)
        //   );
        //   const exists = fs.existsSync(uriImpMeth.fsPath);
        //   if (!exists) {
        //     wsedit.createFile(uriImpMeth, {
        //       overwrite: true,
        //       ignoreIfExists: false,
        //     });
        //     wsedit.insert(
        //       uriImpMeth,
        //       new vscode.Position(0, 0),
        //       methodContent(content)
        //     );
        //   } else {
        //     fs.readFileSync(uriImpMeth.fsPath).toString();
        //   }
        // }
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
