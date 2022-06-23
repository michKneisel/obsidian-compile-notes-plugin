# Compile Notes Plugin

This plugin assists with longform writing. You can convert multiple notes by linking to them in another file and then using the plugins Compile Notes command to export them to a single file.

## How it works
The plugin will analyse the text of the current note you are in when you call the command *Compile Notes*. It will pick up the wiki links of the notes you have added to this note. Find the markdown file in the folder and read it's content into the file you have designated (the default is "Manifest.md). 
```
[[Note 1]]
[[Note 2]]

```
This will produce a file with only the contents of current file and the contents of the notes the links pointed to. If you include headings and other content, in amongst your links, they will be preserved.

## Settings
### Folder
You can create or let the plugin create the folder you would like your compiled notes to be stored. Default: \Manifest
### Filename
Specify the name of the file you would like the compiled notes note to be called. Default: Manifest.md
### Overwrite Existing File
When turned on, the file will be trashed to the system recycle bin. 
NOTE: currently your saved compile notes file will always be overwritten.
### Do not show links
When turned on, your saved compile notes file will not contain any of the links. This setting assumes that you have a newline (\\n) after your link. If you do not, your link will not be removed. If you want to remove links, ensure you have a newline after each link, such as the example above. Currently if have other links in your document that are in other folders or do not exist yet, if you want preserve them, you need to toggle this setting off. It will remove all wiki links in the compiled note.

**Note:**
- Only supports wiki links.
- All notes need to be in the *same* folder - any folder, it does not have to be a root folder.
- Currently all previous "compiled note files" (Manifest.md) will be moved to the system trash and a new file with the same name, as specified in the settings will be created.
- it features 2 levels of notes. Therefore you can have your main note, which has a list of links to other notes. These notes can have links to other notes and both levels will be pulled into your Manifest.md. If the 2nd levels have links to other notes, these will be left as is and not replaced with their content.


**Note:** The Obsidian API is still in early alpha and is subject to change at any time!

This sample plugin demonstrates some of the basic functionality the plugin API can do.
- Changes the default font color to red using `styles.css`.
- Adds a ribbon icon, which shows a Notice when clicked.
- Adds a command "Open Sample Modal" which opens a Modal.
- Adds a plugin setting tab to the settings page.
- Registers a global click event and output 'click' to the console.
- Registers a global interval which logs 'setInterval' to the console.

## First time developing plugins?

Quick starting guide for new plugin devs:

- Check if [someone already developed a plugin for what you want](https://obsidian.md/plugins)! There might be an existing plugin similar enough that you can partner up with.
- Make a copy of this repo as a template with the "Use this template" button (login to GitHub if you don't see it).
- Clone your repo to a local development folder. For convenience, you can place this folder in your `.obsidian/plugins/your-plugin-name` folder.
- Install NodeJS, then run `npm i` in the command line under your repo folder.
- Run `npm run dev` to compile your plugin from `main.ts` to `main.js`.
- Make changes to `main.ts` (or create new `.ts` files). Those changes should be automatically compiled into `main.js`.
- Reload Obsidian to load the new version of your plugin.
- Enable plugin in settings window.
- For updates to the Obsidian API run `npm update` in the command line under your repo folder.

## Releasing new releases

- Update your `manifest.json` with your new version number, such as `1.0.1`, and the minimum Obsidian version required for your latest release.
- Update your `versions.json` file with `"new-plugin-version": "minimum-obsidian-version"` so older versions of Obsidian can download an older version of your plugin that's compatible.
- Create new GitHub release using your new version number as the "Tag version". Use the exact version number, don't include a prefix `v`. See here for an example: https://github.com/obsidianmd/obsidian-sample-plugin/releases
- Upload the files `manifest.json`, `main.js`, `styles.css` as binary attachments. Note: The manifest.json file must be in two places, first the root path of your repository and also in the release.
- Publish the release.

> You can simplify the version bump process by running `npm version patch`, `npm version minor` or `npm version major` after updating `minAppVersion` manually in `manifest.json`.
> The command will bump version in `manifest.json` and `package.json`, and add the entry for the new version to `versions.json`

## Adding your plugin to the community plugin list

- Check https://github.com/obsidianmd/obsidian-releases/blob/master/plugin-review.md
- Publish an initial version.
- Make sure you have a `README.md` file in the root of your repo.
- Make a pull request at https://github.com/obsidianmd/obsidian-releases to add your plugin.

## How to use

- Clone this repo.
- `npm i` or `yarn` to install dependencies
- `npm run dev` to start compilation in watch mode.

## Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/your-plugin-id/`.

## Improve code quality with eslint (optional)
- [ESLint](https://eslint.org/) is a tool that analyzes your code to quickly find problems. You can run ESLint against your plugin to find common bugs and ways to improve your code. 
- To use eslint with this project, make sure to install eslint from terminal:
  - `npm install -g eslint`
- To use eslint to analyze this project use this command:
  - `eslint main.ts`
  - eslint will then create a report with suggestions for code improvement by file and line number.
- If your source code is in a folder, such as `src`, you can use eslint with this command to analyze all files in that folder:
  - `eslint .\src\`


## API Documentation

See https://github.com/obsidianmd/obsidian-api
