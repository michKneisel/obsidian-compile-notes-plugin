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
			let notesFolder = this.settings.notesFolder;
			return path.join(rootNotePath, notesFolder, linkFilename);
		};
		const getRootNoteText = () => {
			const rootNoteFile = this.app.workspace.getActiveFile();
			rootNotePath = rootNoteFile.parent.path;
			return this.app.vault.read(rootNoteFile);
		};
		const replaceLinkWithContent = async (link: string, parentContent: string ) => {
			console.log("level3Item = " + link);
			let fullLinkFilename = getNoteFileName(link);

			let linkedNoteText = await this.app.vault.adapter.read(
				fullLinkFilename
			);
			return parentContent.replace(link, linkedNoteText);
		}
		const loadNotes = async (
			linkMatches: RegExpMatchArray,
			parentNoteText: string
		): Promise<string> => {
			let loadedText = parentNoteText;
			for (const item of linkMatches) {
				try {
					console.log("item = " + item);
					let fullLinkFilename = getNoteFileName(item);

					let linkedNoteText = await this.app.vault.adapter.read(
						fullLinkFilename
					);

					loadedText = loadedText.replace(item, linkedNoteText);
					// scan text of current file for links
					let childLinkMatches =
						linkedNoteText.match(regexWikiGlobal);
					// if has linkMatches -> loop through linkMatches
					if (childLinkMatches) {
						// loop through linkMatches
						for (const childItem of childLinkMatches) {
							try {
							console.log("childItem = " + childItem);
							loadedText = await replaceLinkWithContent(
								childItem,
								loadedText
							);
							let fullLinkFilename = getNoteFileName(childItem);

							let linkedNoteText =
								await this.app.vault.adapter.read(
									fullLinkFilename
								);
							loadedText = loadedText.replace(
								childItem,
								linkedNoteText
							);
							let level3Matches =
								linkedNoteText.match(regexWikiGlobal);
								if(level3Matches) {
									for (const level3Item of level3Matches) {
										try{
											loadedText = await replaceLinkWithContent(level3Item, loadedText)
										} catch(e) {

										}
									}
								}
							} catch(e) {
								console.log("missing file: " + e);
							}
						}
					
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
						const complileNotes = async () => {
							const sourceFile =
								this.app.workspace.getActiveFile();
							let metadataCache =
								this.app.metadataCache.getFileCache(sourceFile);
							let links = metadataCache.links;
							let embeds = metadataCache.embeds;
							let metaData = metadataCache.frontmatter
							let sourceFileText = await this.app.vault.read(
								sourceFile
							);

							if (links != null) {
								findAndReplaceLinks(links, sourceFileText);
							}
							if (embeds != null) {
								findAndReplaceEmbeds(embeds, sourceFileText);
							}
							console.log("sourceFile = " + sourceFileText);
						};
						complileNotes().then();
					}
					return true;
				}
			},
		});

		const findAndReplaceLinks = async (
			links: LinkCache[],
			sourceFileText: string
		) => {
			let vault = this.app.vault;
			let metadataCache = this.app.metadataCache;
			links.forEach(async (link) => {
				let linkTextFile = vault.getAbstractFileByPath(
					link.displayText + ".md"
				);
				let linkFileText = await vault.read(linkTextFile as TFile);
				let linkFileLinks = metadataCache.getFileCache(
					linkTextFile as TFile
				).links;
				sourceFileText = sourceFileText.replace(
					link.original,
					linkFileText
				);
				if (linkFileLinks != null) {
					findAndReplaceLinks(linkFileLinks, linkFileText);
				}
			});
			console.log("findAndReplaceLinks = "+sourceFileText)
		};

		const findAndReplaceEmbeds = async (
			embeds: EmbedCache[],
			sourceFileText: string
		) => {
			let vault = this.app.vault;
			let metadataCache = this.app.metadataCache;
			embeds.forEach(async (embed) => {
				let embedTextFile = vault.getAbstractFileByPath(
					embed.displayText + ".md"
				);
				let embedFileText = await vault.read(embedTextFile as TFile);
				let embedFileLinks = metadataCache.getFileCache(
					embedTextFile as TFile
				).links;
				sourceFileText = sourceFileText.replace(
					embed.original,
					embedFileText
				);
				if (embedFileLinks != null) {
					findAndReplaceLinks(embedFileLinks, embedFileText);
				}
			});
		};

		this.addCommand({
			id: "compile-notes-into-one",
			name: "Compile notes to one file",
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
								console.log("removelinks");
								manuscript = this.removeAllLinks(notesToSave);
							} else {
								manuscript = notesToSave;
							}
							// write to manuscript
							console.log(
								"Notes to save to manuscript " + manuscript
							);
							this.createNewNote(manuscript);
						});
					}
					console.log("all done");
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
		return textToScan.replace(regexWikiGlobal, "");
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
