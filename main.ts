import { App, MarkdownView, normalizePath, TFolder, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import * as path from 'path';
import { text } from 'stream/consumers';
// Remember to rename these classes and interfaces!

interface CompileNotesSettings {
	compileToFolder: string;
	compileToFilename: string;
	overwriteExistingFile: boolean;
	removeLinks: boolean;
}

const DEFAULT_SETTINGS: CompileNotesSettings = {
	compileToFolder: 'Manuscript',
	compileToFilename: "Manuscript.md",
	overwriteExistingFile: true,
	removeLinks: true
}

export default class CompileNotes extends Plugin {
	settings: CompileNotesSettings;

	folder: TFolder;
	newDirectoryPath: string;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'compile-notes-into-one',
			name: 'Compile notes to one file',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					if (!checking) {

						const currentNote = async (): Promise<String> => {
							const noteFile = this.app.workspace.getActiveFile();

							let text = await this.app.vault.read(noteFile);
							let compiledContent = "";
							await this.extractContentFromLinks(text).then(
								text => compiledContent = text
							)

							if (this.settings.removeLinks) {
								await this.removeAllLinks(compiledContent).then(content => compiledContent = content)
							}
							await this.createNewNote(compiledContent);

							return text
						}
						currentNote().then();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	/**
  * Creates a directory (recursive) if it does not already exist.
  * This is a helper function that includes a workaround for a bug in the
  * Obsidian mobile app.
  */
	private async createDirectory(dir: string): Promise<void> {
		const { vault } = this.app;
		const { adapter } = vault;
		const root = vault.getRoot().path;
		const directoryPath = path.join(this.folder.path, dir);
		const directoryExists = await adapter.exists(directoryPath);

		if (!directoryExists) {
			return adapter.mkdir(normalizePath(directoryPath));
		}
	}

	async createNewNote(input: string): Promise<void> {
		this.folder = this.app.vault.getRoot();
		this.newDirectoryPath = this.settings.compileToFolder;
		const { vault } = this.app;
		const { adapter } = vault;
		const prependDirInput = path.join(this.newDirectoryPath, input);
		const { dir, name } = path.parse(prependDirInput);
		const directoryPath = path.join(this.folder.path, dir);
		const filename = this.settings.compileToFilename
		const filePath = path.join(directoryPath, filename);

		try {
			const fileExists = await adapter.exists(filePath);
			if (fileExists) {
				console.log(filePath)
				let file = vault.getAbstractFileByPath(normalizePath(filePath))
				if (file instanceof TFile) {
					vault.trash(file, true)
					new Notice("File: " + filename + " has been trashed")
				} else {
					new Notice("can't find file")
				}
			}
			if (dir !== '') {
				await this.createDirectory(dir);
			}
			await vault.create(filePath, input);
			new Notice("New " + filename + " has been created")
			
		} catch (error) {
			new Notice(error.toString());
		}
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async removeAllLinks(textToScan: string): Promise<string>{
		const regexWikiGlobal = /\[\[([^\]]*)\]\]/g
		let wikiLinkMatches = textToScan.match(regexWikiGlobal)
		let removedLinksContent = "";
		if (wikiLinkMatches) {
			console.log("wikilinkmatches "+wikiLinkMatches.length)
			for (const item of wikiLinkMatches) {
				const regexWiki = /\[\[([^\]]+)\]\]/
				removedLinksContent += textToScan.replace(item.match(regexWiki)[0] + "\n", "")
			}
		}
		return removedLinksContent;
	}

	async extractContentFromLinks(textToScan: string): Promise<string> {
		const regexWikiGlobal = /\[\[([^\]]*)\]\]/g
		let wikiMatches = textToScan.match(regexWikiGlobal)
		let compiledContent = "";
		let secondLevelWikiMatches;
		console.log("compiledcontent "+compiledContent)
		if (wikiMatches) {
			for (const item of wikiMatches) {
				const regexWiki = /\[\[([^\]]+)\]\]/
				let linkText = item.match(regexWiki)[1]
				try {
					let file = await this.app.vault.adapter.read(linkText + ".md")
					compiledContent += file + "\n";
					console.log("first level "+compiledContent)
					// recursive 2nd level
					secondLevelWikiMatches = file.match(regexWikiGlobal);
					console.log("secondLevelWikiMathches "+secondLevelWikiMatches.length)
					if (secondLevelWikiMatches) {
						let secondLevelText = "";
						for (const secondItem of secondLevelWikiMatches) {
							console.log("secondItem "+secondItem.match(regexWiki)[1])
							this.extractContentFromLinks(secondItem.match(regexWiki)[1]).then(
								content => secondLevelText +=content
								)
						}
						compiledContent += secondLevelText
					}
				} catch (e) {
					// do nothing carry on
				}
			}
		}

		return compiledContent;
	}
}

		class SampleModal extends Modal {
			constructor(app: App) {
				super(app);
			}

			onOpen() {
				const { contentEl } = this;
				contentEl.setText('Woah!');
			}

			onClose() {
				const { contentEl } = this;
				contentEl.empty();
			}
		}

		class SampleSettingTab extends PluginSettingTab {
			plugin: CompileNotes;

			constructor(app: App, plugin: CompileNotes) {
				super(app, plugin);
				this.plugin = plugin;
			}

			display(): void {
				const { containerEl } = this;

				containerEl.empty();

				containerEl.createEl('h2', { text: 'Compile Notes Settings' });

				new Setting(containerEl)
					.setName('Folder')
					.setDesc('Your markdown file will be saved into this folder')
					.addText(text => text
						.setPlaceholder('Folder')
						.setValue(this.plugin.settings.compileToFolder)
						.onChange(async (value) => {
							this.plugin.settings.compileToFolder = value;
							await this.plugin.saveSettings();
						}));

				new Setting(containerEl)
					.setName('File name')
					.setDesc('Your markdown file name')
					.addText(text => text
						.setPlaceholder('Filename')
						.setValue(this.plugin.settings.compileToFilename)
						.onChange(async (value) => {
							this.plugin.settings.compileToFilename = value;
							await this.plugin.saveSettings();
						}));

				new Setting(containerEl)
					.setName("Overwrite existing file")
					.setDesc("When turned on, the file will be trashed to the system recycle bin. NOTE: currently your " + this.plugin.settings.compileToFilename + " will always be overwritten")
					.addToggle(toggle => toggle.setValue(this.plugin.settings.overwriteExistingFile)
						.onChange((value) => {
							this.plugin.settings.overwriteExistingFile = value;
							this.plugin.saveData(this.plugin.settings);
						}));

				new Setting(containerEl)
					.setName("Do not show links")
					.setDesc("When turned on, your " + this.plugin.settings.compileToFilename + " will not contain any of the links."
						+ "\nThis setting assumes that you have an end of line (\\n) after your link. If you do not, your link will not be removed.")
					.addToggle(toggle => toggle.setValue(this.plugin.settings.removeLinks)
						.onChange((value) => {
							this.plugin.settings.removeLinks = value;
							this.plugin.saveData(this.plugin.settings);
						}));

				// // 						if( !this.plugin.settings.overwriteExistingFile) {
				// // 							new Setting(containerEl)
				// //   .setName('Number of repetitions')
				// //   .setDesc('Here you can set your default number for repetition reminders')
				// //   .setValue(this.plugin.settings.repetitions) // <-- Add me!
				// //   .addDropdown(dropDown => {
				// //   	dropDown.addOption('1', '1 Repetition');
				// //   	dropDown.addOption('2', '2 Repetitions');
				// //   	dropDown.onChange(async (value) =>	{
				// //   		this.plugin.settings.repetitions = value;
				// //   		await this.plugin.saveSettings();
				// //   	});
				//   });
				// }
			}
		}
