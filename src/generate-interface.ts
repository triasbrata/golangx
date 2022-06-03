import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode"
export const generateInterfaceCmd = vscode.commands.registerCommand('golangx.implementGen',async (uri:vscode.Uri) => {
    //get init path
    const initPath  = path.join(uri.fsPath, 'impl', "init.go");
    console.log({initPath});
    const initCnt = fs.readFileSync(initPath).toString();
    console.log(initCnt.match(/type\s([a-zA-z]+)\sinterface/g));

})