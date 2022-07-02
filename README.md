This plugin assists with longform writing. You can convert multiple notes by linking to them in another file and then using the plugins Compile Notes command to export them to a single file.

## How it works
The plugin will analyse the text of the current note you are in when you call the command *Compile Notes*. It will pick up the wiki links of the notes you have added to this note. Find the markdown file in the folder and read it's content into the file you have designated (the default is "Manifest.md). It supports wiki links and transclude links.
```
[[Note 1]]
[[Note 2]]
![[Note 3]]
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
### Remove links
When turned on, your saved compile notes file will not contain any of the links. If you have other links in your document that are in other folders or do not exist yet, if you want preserve them, you need to toggle this setting off. It will remove all wiki links in the compiled note.
### Remove metadata / frontmatter
When turned on, your saved compile notes file will not contain any frontmatter or yaml metadata, if you want to preserve it in your complied note, you need to toggle this setting off. 

**Note:**
- Only supports wiki links and transclude links - no markdown link support, they will remain in the document.
- Currently all previous "compiled note files" (Manifest.md) will be moved to the system trash and a new file with the same name, as specified in the settings will be created.
- The plugin is recursive, it will pull content from child notes into your main document.
- I have no idea if this plugin supports anything other than Windows 10. Let me know in the discussion.
- This plugin will not overwite any of your data, it only reads your notes and writes to a new file. If it fails, it just won't write a new file and you'll have to go old school copy and paste.
- I am a software developer and I'm doing a masters dissertation in the humanities, I wrote this plugin for myself.
- I use pandoc cli to then convert the Manuscript.md file into Ms Word because the Humanities still operate in the dark ages. 
