// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {window, workspace, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument, TextEditor} from 'vscode';
import vscode = require('vscode');

// this method is called when your extension is activated. activation is
// controlled by the activation events defined in package.json
export function activate(ctx: ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "Wordcount" is now active!');

    // create a new word counter
    let wordCounter = new WordCounter();
    let controller = new WordCounterController(wordCounter);

    // add to a list of disposables which are disposed when this extension
    // is deactivated again.
    ctx.subscriptions.push(controller);
    ctx.subscriptions.push(wordCounter);
}

export class WordCounter {

    private _statusBarItem: StatusBarItem;

    public updateWordCount() {
        
        // Create as needed
        if (!this._statusBarItem) {
            this._statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
        } 

        // Get the current text editor
        let editor = window.activeTextEditor;
        if (!editor) {
            this._statusBarItem.hide();
            return;
        }

        let doc = editor.document;

        // Only update status if an MD file
        if (doc.languageId === "markdown") {

            // only if words are selected::
            if (editor.selection.isEmpty == false) {
                let wordCount = this._getWordCount(doc.getText(editor.selection));
                // Update the status bar
                this._statusBarItem.text = `$(pencil) ${wordCount} 文字`;

            } else { // if no word selected::
                let counts = this._getWordLimitAndCount(editor);
                if (counts[0] == -1 || counts[1] == -1) {
                    let wordCount = this._getWordCount(doc.getText());
                    this._statusBarItem.text = `$(pencil) ${wordCount} 文字`;
                } else {
                    this._statusBarItem.text = `$(pencil) ${counts[0]} / ${counts[1]} 文字`;
                }
            }
            this._statusBarItem.show();
            
        } else {
            this._statusBarItem.hide();
        }
    }

    public _getWordCount(docContent: string): number {
        // Parse out unwanted whitespace so the split is accurate
        docContent = this._removeMDHeaders(docContent);
        docContent = this._removeSpaces(docContent);
        let wordCount = 0;
        if (docContent != "") {
            wordCount = docContent.length;
        }

        return wordCount;
    }

    _removeSpaces(content: string): string {
        content = content.replace(/(< ([^>]+)<)/g, '').replace(/\s+/g, '');
        content = content.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
        return content;
    }

    _removeMDHeaders(content: string): string {
        content = content.replace(/^\s*?[-+*]\s/mg, '');
        content = content.replace(/^\s*?#+?\s/mg, '');
        content = content.replace(/^\s*?[0-9]\.\s/mg, '');
        return content;
    }

    _searchMDHeaders(content: string): boolean {
        if (content.search(/^\s*?[-+*]\s/) == -1) {
            if (content.search(/^\s*?#+?\s/) == -1) {
                if (content.search(/^\s*?[0-9]\.\s/) == -1) {
                    return false;
                }
            }
        }
        return true;
    }

    _getLimitCountFromHeader(header: string): number {
        header = this._removeSpaces(header);
        let matched = header.match(/\(([0-9].+)\)$/);
        if(matched == null) {
            return -1;
        } else {
            return Number(matched[1]);
        }
    }

    public _getWordLimitAndCount(editor: TextEditor):[Number, Number] {

        let cursorLineText:string = editor.document.lineAt(editor.selection.active.line).text;
        if (this._searchMDHeaders(cursorLineText)) {
            //header側
            let limitCount = this._getLimitCountFromHeader(cursorLineText);

            let nextLineText = editor.document.lineAt(editor.selection.active.line+1).text;

            let textCount = this._getWordCount(nextLineText);

            return [textCount, limitCount];

        } else {
            //文章側
            if (editor.selection.active.line == 0) {
                return [-1,-1];
            }

            let previousLineText:string = editor.document.lineAt(editor.selection.active.line-1).text;

            if (this._searchMDHeaders(previousLineText)) {

                let limitCount = this._getLimitCountFromHeader(previousLineText);

                let textCount = this._getWordCount(cursorLineText);
                
                return [textCount, limitCount]; 

            } else {
                return [-1,-1];
            }

        }

    }

    public dispose() {
        this._statusBarItem.dispose();
    }
}

class WordCounterController {

    private _wordCounter: WordCounter;
    private _disposable: Disposable;

    constructor(wordCounter: WordCounter) {
        this._wordCounter = wordCounter;
        this._wordCounter.updateWordCount();

        // subscribe to selection change and editor activation events
        let subscriptions: Disposable[] = [];
        window.onDidChangeTextEditorSelection(this._onEvent, this, subscriptions);
        window.onDidChangeActiveTextEditor(this._onEvent, this, subscriptions);

        // create a combined disposable from both event subscriptions
        this._disposable = Disposable.from(...subscriptions);
    }

    private _onEvent() {
        this._wordCounter.updateWordCount();
    }

    public dispose() {
        this._disposable.dispose();
    }
}
