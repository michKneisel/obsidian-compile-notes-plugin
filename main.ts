import {
	App,
	MarkdownView,
	normalizePath,
	TFolder,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
} from "obsidian";
import * as path from "path";
import { text } from "stream/consumers";
import { fileURLToPath } from "url";
// Remember to rename these classes and interfaces!

interface CompileNotesSettings {
	compileToFolder: string;
	compileToFilename: string;
	overwriteExistingFile: boolean;
	removeLinks: boolean;
}

const DEFAULT_SETTINGS: CompileNotesSettings = {
	compileToFolder: "Manuscript",
	compileToFilename: "Manuscript.md",
	overwriteExistingFile: true,
	removeLinks: true,
};

interface NestedObject {
	name: string;
	value: number;
	children?: NestedObject[];
}

const nestedObjects: NestedObject[] = [
	{
		name: "First Parent",
		value: 100,
		children: [
			{
				name: "First Child",
				value: 110,
			},
			{
				name: "Second Child",
				value: 120,
				children: [
					{
						name: "First Grandchild",
						value: 121,
					},
					{
						name: "Second Grandchild",
						value: 122,
					},
				],
			},
		],
	},
	{
		name: "Second Parent",
		value: 200,
		children: [
			{
				name: "First Child",
				value: 210,
			},
			{
				name: "Second Child",
				value: 220,
			},
			{
				name: "Third Child",
				value: 230,
				children: [
					{
						name: "First Grandchild",
						value: 231,
					},
				],
			},
		],
	},
];

export default class CompileNotes extends Plugin {
	settings: CompileNotesSettings;

	folder: TFolder;
	newDirectoryPath: string;

	async onload() {
		await this.loadSettings();

		let rootNotePath = "";
		const regexWikiGlobal = /\[\[([^\]]*)\]\]/g;

		const getNoteFileName = (noteLink: string) => {
			const regexWiki = /\[\[([^\]]+)\]\]/;
			let linkText = noteLink.match(regexWiki)[1];
			let linkFilename = linkText + ".md";
			return path.join(rootNotePath, linkFilename);
		};
		const getRootNoteText = () => {
			const rootNoteFile = this.app.workspace.getActiveFile();
			rootNotePath = rootNoteFile.parent.path;
			return this.app.vault.read(rootNoteFile);
		};
		const loadNotes = async (
			linkMatches: RegExpMatchArray,
			parentNoteText: string
		): Promise<string> => {
			let loadedText = parentNoteText;
			for (const item of linkMatches) {
				try {
					// console.log("item = " + item);
					// on each item of loop - extract the text from current note
					// read file of first linkMatch
					let fullLinkFilename = getNoteFileName(item);
					// console.log("filename = " + fullLinkFilename)
					let linkedNoteText = await this.app.vault.adapter.read(
						fullLinkFilename
					);
					// console.log("linkedNoteText = " + linkedNoteText);
					// add text of current note to totalText
					let concatedNotes = "".concat(loadedText, linkedNoteText);
					loadedText = concatedNotes;
					// scan text of current file for links
					let childLinkMatches =
						linkedNoteText.match(regexWikiGlobal);
					// if has linkMatches -> loop through linkMatches
					if (childLinkMatches) {
						// loop through linkMatches
						let newNotes = await loadNotes(
							childLinkMatches,
							linkedNoteText
						);
						let concatedNotes = "".concat(loadedText, newNotes);
						loadedText = concatedNotes;
					} else {
						console.log("no links in " + fullLinkFilename);
					}
				} catch (e) {
					console.log("missing file: " + e);
				}
			}
			return loadedText;
		};

		this.addCommand({
			id: "compile-notes-testing",
			name: "Compile notes testing",
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					if (!checking) {
						const compileNotes = async () => {
							let totalText = "";
							// extracted the text from current note
							let noteText = await getRootNoteText();
							// scan text of current file for links
							let linkMatches = noteText.match(regexWikiGlobal);
							if (linkMatches) {
								// loop through linkMatches
								let loadedNotes = await loadNotes(
									linkMatches,
									noteText
								);
								totalText += loadedNotes;
							} else {
								// if called on a note without links - content will just be written to manuscript file
								// actually ask if that is what yo want - to avoid accidentally overwriting an existing manuscript
								// file
								console.log("no links in here");
								totalText += noteText;
							}
							return totalText;
						};
						compileNotes().then((notesToSave) => {
							// remove all links
							let manuscript = "";
							if (this.settings.removeLinks) {
								console.log("removelinks")
								manuscript = this.removeAllLinks(notesToSave)
							} else {
								manuscript = notesToSave
							}
							// write to manuscript
							console.log("Notes to save to manuscript "+manuscript)
							this.createNewNote(manuscript);
						});
					}
					console.log("all done");
					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			},
		});

		this.addCommand({
			id: "compile-notes-into-one",
			name: "Compile notes to one file",
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					if (!checking) {
						// console.log("in checking");
						// const currentNote = async (): Promise<String> => {
						// 	const noteFile = this.app.workspace.getActiveFile();

						// 	// set totatText to ""
						// 	// get content of currentNote/originating note
						// 	// extract the text from current note
						// 	// get path of the current note
						// 	// add text of current note to totalText
						// 	// scan text of current file for links
						// 	// if has linkMatches
						// 	// loop through linkMatches
						// 	// on each item of loop - extract the text from current note
						// 	// get path of current note
						// 	// add text of current note to totalText
						// 	// scan text of current file for links
						// 	// if has linkMatches -> loop through linkMatches

						// 	let text = await this.app.vault.read(noteFile);
						// 	console.log("test = " + text);
						// 	let compiledContent = "";

						// 	console.log("path " + noteFile.parent.path);
						// 	await this.extractContentFromLinks(
						// 		text,
						// 		noteFile.parent.path
						// 	).then((text) => (compiledContent = text));

						// 	if (this.settings.removeLinks) {
						// 		await this.removeAllLinks(compiledContent).then(
						// 			(content) => (compiledContent = content)
						// 		);
						// 	}
						// 	await this.createNewNote(compiledContent);

						// 	return text;
						// };
						// currentNote().then();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			console.log("click", evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		);
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
		const filename = this.settings.compileToFilename;
		const filePath = path.join(this.newDirectoryPath, filename);

		try {
			const fileExists = await adapter.exists(filePath);
			if (fileExists) {
				console.log(filePath);
				let file = vault.getAbstractFileByPath(normalizePath(filePath));
				if (file instanceof TFile) {
					vault.trash(file, true);
					new Notice("File: " + filename + " has been trashed");
				} else {
					new Notice("can't find file");
				}
			}

			await this.createDirectory(this.newDirectoryPath);
			await vault.create(filePath, input);
			new Notice("New " + filename + " has been created");
		} catch (error) {
			new Notice(error.toString());
		}
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	removeAllLinks(textToScan: string): string {
		const regexWikiGlobal = /\[\[([^\]]*)\]\]/g;
		return textToScan.replace(regexWikiGlobal, '')
	}

	async extractContentFromLinks(
		textToScan: string,
		path: string
	): Promise<string> {
		console.log("textToScan " + textToScan);
		const regexWikiGlobal = /\[\[([^\]]*)\]\]/g;
		let wikiMatches = textToScan.match(regexWikiGlobal);
		let compiledContent = "";
		let secondLevelWikiMatches;
		if (wikiMatches) {
			console.log("has wikiMatches");
			for (const item of wikiMatches) {
				const regexWiki = /\[\[([^\]]+)\]\]/;
				let linkText = item.match(regexWiki)[1];
				try {
					let fileToREad = "\\" + path + "\\" + linkText + ".md";
					let file = await this.app.vault.adapter.read(fileToREad);
					compiledContent += file + "\n";
					console.log("compiledContent = " + compiledContent);
					// recursive 2nd level
					secondLevelWikiMatches = file.match(regexWikiGlobal);
					console.log(
						"secondLevelWikiMathches " +
							secondLevelWikiMatches.length
					);
					if (secondLevelWikiMatches) {
						let secondLevelText = "";
						for (const secondItem of secondLevelWikiMatches) {
							console.log(
								"secondItem " + secondItem.match(regexWiki)[1]
							);
							this.extractContentFromLinks(
								secondItem.match(regexWiki)[1],
								path
							).then((content) => (secondLevelText += content));
						}
						compiledContent += secondLevelText;
					}
				} catch (e) {
					// do nothing carry on
					console.log("cant find the file " + e);
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
		contentEl.setText("Woah!");
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

		containerEl.createEl("h2", { text: "Compile Notes Settings" });

		new Setting(containerEl)
			.setName("Folder")
			.setDesc("Your markdown file will be saved into this folder")
			.addText((text) =>
				text
					.setPlaceholder("Folder")
					.setValue(this.plugin.settings.compileToFolder)
					.onChange(async (value) => {
						this.plugin.settings.compileToFolder = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("File name")
			.setDesc("Your markdown file name")
			.addText((text) =>
				text
					.setPlaceholder("Filename")
					.setValue(this.plugin.settings.compileToFilename)
					.onChange(async (value) => {
						this.plugin.settings.compileToFilename = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Overwrite existing file")
			.setDesc(
				"When turned on, the file will be trashed to the system recycle bin. NOTE: currently your " +
					this.plugin.settings.compileToFilename +
					" will always be overwritten"
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.overwriteExistingFile)
					.onChange((value) => {
						this.plugin.settings.overwriteExistingFile = value;
						this.plugin.saveData(this.plugin.settings);
					})
			);

		new Setting(containerEl)
			.setName("Do not show links")
			.setDesc(
				"When turned on, your " +
					this.plugin.settings.compileToFilename +
					" will not contain any of the links." +
					"\nThis setting assumes that you have an end of line (\\n) after your link. If you do not, your link will not be removed."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.removeLinks)
					.onChange((value) => {
						this.plugin.settings.removeLinks = value;
						this.plugin.saveData(this.plugin.settings);
					})
			);

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
