import * as vscode from "vscode"
import * as cp from "child_process";

export const execShell = (cmd: string) =>
    new Promise<string>((resolve, reject) => {
        cp.exec(cmd, (err, out) => {
            if (err) {
                return reject(err);
            }
            return resolve(out);
        });
    });

export const getFilePath = (uri:vscode.Uri) => {
	const regex = /\/[A-Za-z0-9_-]+\.go/;
	const path = uri.path.replace(regex, '/');
	return path;
};

export const genMockery = async (path: string, interfaceName: string, args: string): Promise<string> => {
	const cmd = `cd ${path} && mockery ${args} --name ${interfaceName} --print`;
	console.log(cmd);
	return await execShell(cmd);
};
export const getInterfaces = (value: string): Array<string> => {
	const regex = /type\s([A-Za-z].*)\sinterface/g;
	var interfaces = new Array;
	let matches;
	while ((matches = regex.exec(value)) !== null) {
		interfaces.push(matches[1]);
	}
	return interfaces;
};