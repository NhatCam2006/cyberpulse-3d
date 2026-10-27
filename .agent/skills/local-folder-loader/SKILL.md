---
name: local-folder-loader
description: Seamless local music directory ingestion via webkitdirectory, File System Access API, Drag-and-Drop, and public/music static scanning.
---

# Local Music Folder Ingestion Rules

## 1. Multi-Method Local Audio Loading
Support 3 effortless ways for the user to load their music on Desktop:
1. **Folder Picker Button ("LOAD MUSIC FOLDER"):**
   Use a hidden `<input type="file" webkitdirectory="" directory="" multiple accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a" />`. When clicked, filter all audio files from the selected folder and convert each `File` into an Object URL via `URL.createObjectURL(file)`.
2. **File Picker Button ("ADD FILES"):**
   Standard multiple audio file input for picking individual tracks.
3. **Global Window Drag & Drop:**
   Allow dragging and dropping `.mp3/.wav/.flac/.ogg` files directly onto the application window with a glowing Cyberpunk dropzone overlay.

## 2. Metadata Parsing & Memory Safety
- Parse clean display titles from filenames: strip `.mp3/.wav/.flac` extensions, and split `Artist - Title` if a hyphen is present.
- Store tracks in Zustand (`usePlayerStore.ts`) with `{ id, title, artist, url, fileName }`.
- Automatically advance to the next track when `audioElement.onended` fires.