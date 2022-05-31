// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as cp from "child_process";
import * as fs from 'fs';

const execShell = (cmd: string) =>
    new Promise<string>((resolve, reject) => {
        cp.exec(cmd, (err, out) => {
            if (err) {
                return reject(err);
            }
            return resolve(out);
        });
    });

const getFilePath = (uri:vscode.Uri) => {
	const regex = /\/[A-Za-z0-9_-]+\.go/;
	const path = uri.path.replace(regex, '/');
	return path;
};

const genMockery = async (path: string, interfaceName: string, args: string): Promise<string> => {
	const cmd = `cd ${path} && mockery ${args} --name ${interfaceName} --print`;
	console.log(cmd);
	return await execShell(cmd);
};

const getInterfaces = (value: string): Array<string> => {
	const regex = /type\s([A-Za-z].*)\sinterface/g;
	var interfaces = new Array;
	let matches;
	while ((matches = regex.exec(value)) !== null) {
		interfaces.push(matches[1]);
	}
	return interfaces;
};

export function activate(context: vscode.ExtensionContext) {
	console.log('"golanx" is now active!');
	let disposable = vscode.commands.registerCommand('golanx.mockGen', async (uri:vscode.Uri) => {
		var text = fs.readFileSync(uri.fsPath);
		const interfaces = getInterfaces(text.toString());
		const wsedit = new vscode.WorkspaceEdit();
		if(interfaces && interfaces.length > 0){
			const path = getFilePath(uri);
			for(const i of interfaces){
				const newFile = vscode.Uri.file(path + `mock_${i}.go`);
				const args =  "--inpackage"
				wsedit.createFile(newFile, { ignoreIfExists: true });
				const mockContent = await genMockery(path, i, args);
				wsedit.insert(newFile,new vscode.Position(0, 0), mockContent);
			}
			vscode.workspace.applyEdit(wsedit);
			vscode.window.showInformationMessage('golanx generated file');
		}
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
