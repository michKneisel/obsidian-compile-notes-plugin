import {
	App,
	MarkdownView,
	normalizePath,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	ReferenceCache,
} from "obsidian";
import * as path from "path";

interface CompileNotesSettings {
	compileToFolder: string;
	compileToFilename: string;
	overwriteExistingFile: boolean;
	removeLinks: boolean;
	notesFolder: string;
	removeFrontmatter: boolean;
}

const DEFAULT_SETTINGS: CompileNotesSettings = {
	compileToFolder: "Manuscript",
	compileToFilename: "Manuscript.md",
	overwriteExistingFile: true,
	removeLinks: true,
	notesFolder: "notes",
	removeFrontmatter: true,
};

export default class CompileNotes extends Plugin {
	settings: CompileNotesSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "compile-notes-to-manuscript",
			name: "Compile notes into one",
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);

				if (markdownView) {
					if (!checking) {
						const sourceFile = this.app.workspace.getActiveFile();
						const sourcFilePath = sourceFile.parent.path;
						const vault = this.app.vault;
						const app = this.app;
						const settings = this.settings;
						const fileAdapter = vault.adapter;

						async function compileNotes() {
							const links = await getLinks(sourceFile);

							let contents = await getFileContent(
								sourceFile as TFile
							);

							contents = await replaceLinkContent(
								links,
								contents
							);
							saveToNewFile(contents).then();
						}

						async function saveToNewFile(contents: string) {
							// console.log("***: " + contents);
							let directory = path.join(
								vault.getRoot().path,
								settings.compileToFolder
							);
							const directoryExists = await fileAdapter.exists(
								normalizePath(directory)
							);

							if (!directoryExists) {
								return fileAdapter.mkdir(
									normalizePath(directory)
								);
							}

							try {
								const filename = settings.compileToFilename;
								const filePath = path.join(directory, filename);
								const fileExists = await fileAdapter.exists(
									filePath
								);
								if (fileExists) {
									console.log(filePath);
									let file = vault.getAbstractFileByPath(
										normalizePath(filePath)
									);
									if (file instanceof TFile) {
										vault.trash(file, true);
										new Notice(
											"File: " +
												filename +
												" has been trashed"
										);
									} else {
										new Notice("can't find file");
									}
								}

								await vault.create(filePath, contents);
								new Notice(
									"New " + filename + " has been created"
								);
							} catch (error) {
								new Notice(error.toString());
							}
						}

						async function getFileName(noteName: string) {
							let fileName = noteName + ".md";
							if (settings.notesFolder.length > 0) {
								fileName = path.join(
									sourcFilePath,
									settings.notesFolder,
									fileName
								);
							} else {
								fileName = path.join(sourcFilePath, fileName);
							}
							return normalizePath(fileName);
						}

						async function replaceLinkContent(
							links: ReferenceCache[],
							contents: string
						) {
							for (const link of links) {
								let fileName = await getFileName(
									link.displayText
								);

								let linkFile =
									vault.getAbstractFileByPath(fileName);

								let fileContent = await getFileContent(
									linkFile as TFile
								);
								if (fileContent != null) {
									contents = contents.replace(
										link.original,
										fileContent
									);
									const childLinks = await getLinks(
										linkFile as TFile
									);

									if (childLinks != null) {
										contents = await replaceLinkContent(
											childLinks,
											contents
										);
									}
								} else {
									console.log(
										"no file for this link " + link.original
									);
									if (settings.removeLinks) {
										contents = contents.replace(
											link.original,
											""
										);
									}
								}
							}
							return contents;
						}

						async function getLinks(file: TFile) {
							// read either links or embeds and return
							let metadataCache =
								app.metadataCache.getFileCache(file);
							let links = metadataCache.links;
							let embeds = metadataCache.embeds;
							if (links != null && embeds != null) {
								return links.concat(embeds);
							} else {
								if (links != null) {
									return links;
								}
								if (embeds != null) {
									return embeds;
								}
							}
						}

						function replaceAtIndex(
							_string: string,
							_index: number,
							_indexEnd: number,
							_newValue: string
						) {
							if (_index > _string.length - 1) {
								return _string;
							} else {
								return (
									_string.substring(0, _index) +
									_newValue +
									_string.substring(_indexEnd)
								);
							}
						}

						async function getFileContent(
							file: TFile
						): Promise<string | null> {
							try {
								// read from the file
								let fileContent = await vault.read(file);
								let frontmatterData =
									app.metadataCache.getFileCache(
										file
									).frontmatter;
								if (frontmatterData != null) {
									let frontmatterStart =
										frontmatterData.position.start.offset;
									let frontmatterEnd =
										frontmatterData.position.end.offset;
									console.log(
										"frontmatter " +
											frontmatterStart +
											" frontmatterEnd " +
											frontmatterEnd
									);
									console.log(
										"meta data = " +
											fileContent.substring(
												frontmatterStart,
												frontmatterEnd
											)
									);
									if (settings.removeFrontmatter) {
										fileContent = replaceAtIndex(
											fileContent,
											frontmatterStart,
											frontmatterEnd,
											""
										);
									}
								}

								return fileContent;
							} catch (e) {
								console.log("error in getFileContent " + e);
								return null;
							}
						}

						compileNotes();
					}
					return true;
				}
			},
		});

		this.addSettingTab(new CompileNotesSettingTab(this.app, this));
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
}

class CompileNotesSettingTab extends PluginSettingTab {
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
			.setDesc(
				"Sub folder that holds the notes (do not put folder separator |/)"
			)
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
			.setName("Remove links")
			.setDesc(
				"When turned on, your " +
					this.plugin.settings.compileToFilename +
					" will not contain any wiki links or transclude links." +
					"It will remove any links that point to notes that have not been created yet."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.removeLinks)
					.onChange((value) => {
						this.plugin.settings.removeLinks = value;
						this.plugin.saveData(this.plugin.settings);
					})
			);

		new Setting(containerEl)
			.setName("Remove Frontmatter / metadata")
			.setDesc(
				"When turned on, your " +
					this.plugin.settings.compileToFilename +
					" will not contain any yaml metadata or frontmatter."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.removeFrontmatter)
					.onChange((value) => {
						this.plugin.settings.removeFrontmatter = value;
						this.plugin.saveData(this.plugin.settings);
					})
			);
	}
}
