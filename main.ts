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
	LinkCache,
	EmbedCache,
	ReferenceCache,
} from "obsidian";
import * as path from "path";
import { off } from "process";
import { text } from "stream/consumers";
import { fileURLToPath } from "url";
// Remember to rename these classes and interfaces!

interface CompileNotesSettings {
	compileToFolder: string;
	compileToFilename: string;
	overwriteExistingFile: boolean;
	removeLinks: boolean;
	notesFolder: string;
}

const DEFAULT_SETTINGS: CompileNotesSettings = {
	compileToFolder: "Manuscript",
	compileToFilename: "Manuscript.md",
	overwriteExistingFile: true,
	removeLinks: true,
	notesFolder: "notes"
};

export default class CompileNotes extends Plugin {
	settings: CompileNotesSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "compile-notes-testing",
			name: "Compile notes testing",
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);

				if (markdownView) {
					if (!checking) {
						const sourceFile =
							this.app.workspace.getActiveFile();
						const vault = this.app.vault;
						const app = this.app
						const settings = this.settings

						async function compileNotes() {
							const links = await getLinks(sourceFile, true);

							let contents = await getFileContent(sourceFile as TFile)

							contents = await replaceLinkContent(links, contents)
							saveToNewFile(contents).then()
						}

						async function createDirectory(dir: string): Promise<void> {

							const { adapter } = vault;
							const root = vault.getRoot().path;
							const directoryPath = path.join(this.folder.path, dir);
							const directoryExists = await adapter.exists(directoryPath);

							if (!directoryExists) {
								return adapter.mkdir(normalizePath(directoryPath));
							}
						}

						async function createNewNote(input: string): Promise<void> {






							// let folder = vault.getRoot();
							// let newDirectoryPath = settings.compileToFolder;

							// const { adapter } = vault;
							// const filename = settings.compileToFilename;
							// const filePath = path.join(newDirectoryPath, filename);

							// try {
							// 	console.log("filepath = "+normalizePath(filePath))
							// 	const fileExists = await adapter.exists("Manuscript");
							// 	if (fileExists) {
							// 		console.log(filePath);
							// 		let file = vault.getAbstractFileByPath(normalizePath(filePath));
							// 		if (file instanceof TFile) {
							// 			vault.trash(file, true);
							// 			new Notice("File: " + filename + " has been trashed");
							// 		} else {
							// 			new Notice("can't find file");
							// 		}
							// 	}

							// 	await createDirectory(newDirectoryPath);
							// 	await vault.create(filePath, input);
							// 	new Notice("New " + filename + " has been created");
							// } catch (error) {
							// 	new Notice(error.toString());
							// }
						}

						async function saveToNewFile(contents: string) {
							// save to manifest.md
							console.log("***: " + contents)
							// check if the directory exits
							// check if the file !exists
							// call createNewNote

							// else move file to trash
							// call createNewNote

							// else create directory
							// call createNewNote
						}

						async function replaceLinkContent(links: ReferenceCache[], contents: string) {
							for (const link of links) {
								let linkFile = vault.getAbstractFileByPath(link.displayText + ".md")
								let fileContent = await getFileContent(linkFile as TFile)
								if (fileContent != null) {
									contents = contents.replace(link.original, fileContent)
									const childLinks = await getLinks(linkFile as TFile, true)

									if (childLinks != null) {
										contents = await replaceLinkContent(childLinks, contents)
									}
								} else {
									if (settings.removeLinks) {
										contents = contents.replace(link.original, "")
									}
								}
							}
							return contents
						}

						async function getLinks(file: TFile, linkCache: boolean) {
							// read either links or embeds and return
							let metadataCache =
								app.metadataCache.getFileCache(file);
							let links = metadataCache.links
							let embeds = metadataCache.embeds
							if (links != null && embeds != null) {
								return links.concat(embeds)
							} else {
								if (links != null) {
									return links
								}
								if (embeds != null) {
									return embeds
								}
							}
						}

						async function getFileContent(file: TFile): Promise<string | null> {
							try {
								// read from the file
								let fileContent = await vault.read(file);
								return fileContent
							} catch (e) {
								return null
							}
						}

						compileNotes()
					}
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
	}

	onunload() { }

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
			.setName("Notes Folder")
			.setDesc("Sub folder that holds the notes (do not put folder separator \|/)")
			.addText((text) =>
				text
					.setPlaceholder("Notes folder")
					.setValue(this.plugin.settings.notesFolder)
					.onChange(async (value) => {
						this.plugin.settings.notesFolder = value;
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
