
/* IMPORT */

// import * as _ from 'lodash';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import axios from 'axios';
import Config, { myExtension } from '../config';

let panel: vscode.WebviewPanel | undefined;
let listeners: vscode.Disposable[] = [];
let openInBrowser: vscode.Disposable;
let currentUrl: string | undefined;

export async function open (context: vscode.ExtensionContext, editor: vscode.TextEditor | undefined) {

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
  rerender(editor);

  if (!openInBrowser) {
    openInBrowser = vscode.commands.registerCommand('peeker.openInBrowser', () => {
      if (currentUrl) vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(currentUrl));
    });
  }

  setPeekerFocused(true);
  panel.onDidChangeViewState(e => setPeekerFocused(e.webviewPanel.active));

  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) rerender(editor);
  }, null, listeners);

  vscode.window.onDidChangeTextEditorSelection(async ({ selections, textEditor }) => {
    if (textEditor && selections[0] && !selections[0].isEmpty) await rerender(textEditor);
  }, null, listeners);
  
  vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
    if (event.affectsConfiguration(`${myExtension}.template`)) rerender(vscode.window.activeTextEditor);
  }, null, listeners);
  context.subscriptions.push(...listeners);

  async function lookup (editor: vscode.TextEditor | undefined) {
    if (!editor || editor.selection.isEmpty) return fallbackContent('No text is selected in the active editor. Please select some.');;

    const sel = editor.selection;
    const text = editor.document.getText(new vscode.Range(sel.start, sel.end));

    const template = Config(editor.document.uri).template;
    if (!template) return fallbackContent('No url template available in settings. See README for instructions on how to configure it.');

    const url = template.replace('%s', encodeURIComponent(text));

    if (url && (url !== currentUrl)) {
      if (panel) panel.webview.html = fallbackContent('Loading ...');

      currentUrl = url;
      return axios.get(url)
        .then(res => res.data)
        .catch(e => { console.error(e); return fallbackContent('No content available'); });
        // .catch(error => fallbackContent(error));
    }
  }

  async function rerender (editor: vscode.TextEditor | undefined) {
    if (panel) {
      const content = await lookup(editor);
      if (content) panel.webview.html = content;
    }
  }

  function fallbackContent (msg: string) {
    return msg;
  }

  function setPeekerFocused(value: boolean) {
		vscode.commands.executeCommand('setContext', 'peeker-focused', value);
  }
  
  panel.onDidDispose(
    () => {
      panel = undefined;
      listeners.forEach(disposable => disposable.dispose());
    },
    null,
    context.subscriptions
  );

}
