// import * as _ from 'lodash';
import * as vscode from 'vscode';

export const myExtension = 'peeker';

let Config = (uri: vscode.Uri) => vscode.workspace.getConfiguration(myExtension, uri);

export default Config;
