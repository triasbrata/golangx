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
	console.log('"golanx" is now active!1');
	let disposable = vscode.commands.registerCommand('golanx.mockGen', async (uri:vscode.Uri) => {
		var text = fs.readFileSync(uri.fsPath);
		const interfaces = getInterfaces(text.toString());
		const wsedit = new vscode.WorkspaceEdit();
		if(interfaces && interfaces.length > 0){
			const path = getFilePath(uri);
			for(const i of interfaces){
				const filename = `mock_${i}.go`;
				const newFile = vscode.Uri.file(path + filename);
				const args =  "--inpackage";
				let mockContent:string| null = null;
				try {
					mockContent = await genMockery(path, i, args);
				} catch (error) {

					const rawMsg = (error as Error).message;
					const msgSplitted = rawMsg.split(new RegExp("\n", "gm"));
					console.log({ msgSplitted});
					const msgIndex =  msgSplitted.findIndex(it => it.includes(" ERR "));
					if (msgIndex !== -1){
						vscode.window.showErrorMessage([`Error generate mock interface ${i} because :`, msgSplitted[msgIndex]].join("\n"));
					}
				}
				if(mockContent !== null){
				const hasFile = wsedit.has(newFile);
				if(hasFile){
					wsedit.deleteFile(newFile, {
						ignoreIfNotExists:true
					});
				}
				wsedit.createFile(newFile, { ignoreIfExists: true });
				wsedit.insert(newFile,new vscode.Position(0, 0), mockContent);
				const message = `golangx  ${hasFile ? "create file" : "update file" } ${filename}`;
				vscode.window.showInformationMessage(message);
				}
			}
			vscode.workspace.applyEdit(wsedit);
			
		}
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
