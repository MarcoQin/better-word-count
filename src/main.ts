import { MarkdownView, Plugin, TFile } from "obsidian";
import { StatusBar } from "./status-bar";
import {WordCounter} from "./counter";

export default class BetterWordCount extends Plugin {
  public recentlyTyped: boolean;
  public statusBar: StatusBar;
  public currentFile: TFile;
  private counter: WordCounter;

  onload() {
    let statusBarEl = this.addStatusBarItem();
    this.statusBar = new StatusBar(statusBarEl);

    this.recentlyTyped = false;
    this.counter = new WordCounter();

    this.registerEvent(
      this.app.workspace.on("file-open", this.onFileOpen, this)
    );

    this.registerEvent(
      this.app.workspace.on("quick-preview", this.onQuickPreview, this)
    );

    this.registerInterval(
      window.setInterval(async () => {
        let activeLeaf = this.app.workspace.activeLeaf;

        if (!activeLeaf || !(activeLeaf.view instanceof MarkdownView)) {
          return;
        }

        let editor = activeLeaf.view.sourceMode.cmEditor;
        if (editor.somethingSelected()) {
          let content: string = editor.getSelection();
          this.updateWordCount(content);
          this.recentlyTyped = false;
        } else if (
          this.currentFile &&
          this.currentFile.extension === "md" &&
          !this.recentlyTyped
        ) {
          const contents = await this.app.vault.cachedRead(this.currentFile);
          this.updateWordCount(contents);
        } else if (!this.recentlyTyped) {
          this.updateWordCount("");
        }
      }, 500)
    );

    let activeLeaf = this.app.workspace.activeLeaf;
    let files: TFile[] = this.app.vault.getMarkdownFiles();

    files.forEach((file) => {
      if (file.basename === activeLeaf.getDisplayText()) {
        this.onFileOpen(file);
      }
    });
  }

  async onFileOpen(file: TFile) {
    this.currentFile = file;
    if (file && file.extension === "md") {
      const contents = await this.app.vault.cachedRead(file);
      this.recentlyTyped = true;
      this.updateWordCount(contents);
    } else {
      this.updateWordCount("");
    }
  }

  onQuickPreview(file: TFile, contents: string) {
    this.currentFile = file;
    const leaf = this.app.workspace.activeLeaf;
    if (leaf && leaf.view.getViewType() === "markdown") {
      this.recentlyTyped = true;
      this.updateWordCount(contents);
    }
  }

  updateWordCount(text: string) {
    text = text.replace("\n", "")
    text = text.replace("\r", "")
    this.counter.count(text);
    let fmt = "共 ${cjk} 字, 非空白字符数: ${total - whitespace}";
    this.statusBar.displayText(this.counter.format(fmt));
  }
}
