
/* IMPORT */

// import * as _ from 'lodash';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import axios from 'axios';
import Config, { myExtension } from '../config';

let panel: vscode.WebviewPanel | undefined;
let listeners: vscode.Disposable[] = [];

export async function open (context: vscode.ExtensionContext) {

  // Only allow one instance to exist
  // see https://code.visualstudio.com/api/extension-guides/webview#visibility-and-moving
  if (panel) {
    // If, for any reason, the reveal doesn't work
    // just continue with creating new webview
    try {
      panel.reveal();
      return;
    }
    catch (e) {
      console.warn(e);
    }
  }

  // Create and show panel
  panel = vscode.window.createWebviewPanel(
    'peeker',
    'Peeker',
    vscode.ViewColumn.Two,
    {
      // Only allow the webview to access resources in our extension's media directory
      //localResourceRoots: [vscode.Uri.file(path.join(Utils.context.extensionPath, 'src', 'views'))],
      // Enable scripts in the webview
      enableScripts: false,
      enableCommandUris: false,
    }
  );

  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) rerender();
  }, null, listeners);

  vscode.window.onDidChangeTextEditorSelection(({ selections }) => {
    if (selections[0] && !selections[0].isEmpty) rerender();
  }, null, listeners);
  
  vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
    if (event.affectsConfiguration(`${myExtension}.template`)) rerender();
  }, null, listeners);
  context.subscriptions.push(...listeners);


  async function lookup () {
    // TODO: Show loading message
    if (panel) panel.webview.html = fallbackContent('Loading ...');

    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.selection.isEmpty) return fallbackContent('No text is selected in the active editor. Please select some.');;

    const sel = editor.selection;
    const text = editor.document.getText(new vscode.Range(sel.start, sel.end));

    const template = Config(editor.document.uri).template;
    if (!template) return fallbackContent('No url template available in settings. See README for instructions on how to configure it.');

    return axios.get(template.replace('%s', encodeURIComponent(text)))
      .then(res => res.data)
      .catch(console.error);

  }

  async function rerender () {
    if (panel) {
      const content = await lookup();
      panel.webview.html = content || fallbackContent('No content available');
    }
  }

  function fallbackContent (msg: string) {
    return msg;
  }

  panel.onDidDispose(
    () => {
      listeners.forEach(disposable => disposable.dispose());
      panel = undefined;
    },
    null,
    context.subscriptions
  );

}
