import * as vscode from 'vscode';
import * as fs from 'fs';
import { genMockery, getFilePath, getInterfaces } from './utils';

export const generateMockCmd = vscode.commands.registerCommand('golangx.mockGen', async (uri:vscode.Uri) => {
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
                wsedit.createFile(newFile, { ignoreIfExists: true, overwrite:true });
                wsedit.insert(newFile,new vscode.Position(0, 0), mockContent);
                const message = `golangx update file ${filename}`;
                vscode.window.showInformationMessage(message);
            }else{
                vscode.window.showInformationMessage(`failed generate mock ${i}`);
            }
        }
        vscode.workspace.applyEdit(wsedit);
        
    }
});