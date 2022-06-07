import * as vscode from "vscode";
import * as cp from "child_process";
import { INSTALL_CMD } from "./constant";

export const execShell = (cmd: string) =>
  new Promise<string>((resolve, reject) => {
    cp.exec(cmd, (err, out) => {
      if (cmd.includes("gopls")) {
        console.log({ cmd, err, out });
      } else {
        if (err) {
          return reject(err);
        }
        return resolve(out);
      }
    });
  });
export async function installMockery(): Promise<void> {
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "install mockery",
      cancellable: false,
    },
    async (progres) => {
      console.log("prepare for install");
      progres.report({
        message: "prepare for install",
      });
      await execShell(INSTALL_CMD).catch((e) => {
        console.error(e);
        throw e;
      });
      console.log("install done");
      progres.report({
        message: "install success",
      });
    }
  );
}
export const getFilePath = (uri: vscode.Uri) => {
  const regex = /\/[A-Za-z0-9_-]+\.go/;
  const path = uri.path.replace(regex, "/");
  return path;
};

export const genMockery = async (
  path: string,
  interfaceName: string,
  args: string,
  mockeryPath = "mockery"
): Promise<string> => {
  const cmd = `cd ${path} && ${mockeryPath} ${args} --name ${interfaceName} --print`;
  console.log(cmd);
  return await execShell(cmd);
};
export const checkMockery = async (mockeryPath = "mockery") => {
  return await execShell(`${mockeryPath} --help`);
};
export const getInterfaces = (value: string): Array<string> => {
  const regex = /type\s([A-Za-z].*)\sinterface/g;
  var interfaces = new Array();
  let matches;
  while ((matches = regex.exec(value)) !== null) {
    interfaces.push(matches[1]);
  }
  return interfaces;
};
