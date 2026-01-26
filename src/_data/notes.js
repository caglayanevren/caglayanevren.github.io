/**
 * From https://github.com/thiagomgd/eleventy_notion_starter
 */

const fs = require("fs");
const { mkdir } = require("fs/promises");
const { Readable } = require('stream');
const { finished } = require('stream/promises');
const path = require("path");
const __CACHEFOLDER = path.resolve(__dirname, "../_cache/images/.cache/");

const metadata = require("../_data/site.json");
const { fetchFromNotion, getNotionProps } = require("../_11ty/notionHelpers");
require("dotenv").config({ path: "../../.env" });
const { Client } = require("@notionhq/client");
const slugify = require("slugify");

// https://github.com/souvikinator/notion-to-md
const { NotionToMarkdown } = require("notion-to-md");

// Define Cache Location and API Endpoint
//const CACHE_FILE_PATH = "src/_cache/notes.json";
const DATABASE_ID = process.env.NOTION_DATABASE_ID;
const TOKEN = process.env.NOTION_API_KEY;

const notion = new Client({ auth: TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });

const getMetadata = (note) => {
    return {
        id: note.id,
        sort: note.sort,
        name: note.name,
        created_time: note.created_time,
        last_edited_time: note.last_edited_time,
        link: note.link,
        linktext: note.linktext,
        humanstxtlink: note.humanstxtlink,
        image: note.image,
        content: note.content,
    };
};

async function fetchPage(pageId) {
    const mdblocks = await n2m.pageToMarkdown(pageId);

    console.debug(`---------------`);
    console.debug("mdblocks: ", mdblocks);

    const mdString = n2m.toMarkdownString(mdblocks);
    console.debug("mdString: ", mdString);

    return mdString;
    //return replaceNotionMarkdown(mdString);
}

async function fetchNotes(since) {
    if (!DATABASE_ID || !TOKEN) {
        console.warn(">>> unable to fetch notes: missing token or db id");
        return null;
    }

    const results = await fetchFromNotion(notion, DATABASE_ID, undefined);

    if (results) {
        console.log(`>>> ${results.length} new notes fetched`);
        //console.log("DATABASE_ID: ", DATABASE_ID);
        //console.log("TOKEN: ", TOKEN);

        const newNotes = {};

        for (const note of results) {
            const noteContent = await fetchPage(note.id);
            const props = getNotionProps(note);
            const newNote = {
                ...getMetadata(note),
                ...props,
                content: noteContent,
            };
            newNotes[note.id] = newNote;
        }
        return newNotes;
    }
    console.log("no result!!");
    return null;
}

function processAndReturn(notes) {
    return Object.values(notes).sort(function (a, b) {
        if (a.sort < b.sort) {
            return -1;
        }
        if (a.sort > b.sort) {
            return 1;
        }
        return 0;
    });
}

const PUBLISHEDNOTES_CACHE_FILE_PATH = "src/_cache/publishedNotes.json";
const IMAGEFOLDER = "src/_cache/images/.cache"

const slugOptions = {
    replacement: "-",
    remove: /[&,’+()$~%.'":*?<>{}]/g,
    lower: true,
    customReplacements: [
        ["Ö", "o"],
        ["ö", "o"],
        ["Ü", "u"],
        ["ü", "u"],
        ["Ş", "s"],
        ["ş", "s"],
        ["Ğ", "g"],
        ["ğ", "g"],
        ["Ç", "c"],
        ["ç", "c"],
        ["İ", "i"],
        ["ı", "i"],
        [".", ""],
        ["’", ""],
        ["’", ""],
        ["’", ""],
    ],
};

async function writeAllImagesToFolder(notes) {
    notes.forEach(async note => {
        const data = {
            imageurl: note.image[0],
            imagename: `${note.sort}-${slugify(note.name, slugOptions)}`
        }
        const downloadFile = (async (url, fileName) => {
          const res = await fetch(url);
          if (!fs.existsSync(IMAGEFOLDER)) await mkdir(IMAGEFOLDER);
          const destination = path.resolve(IMAGEFOLDER, `${fileName}.png`);
          const fileStream = fs.createWriteStream(destination, { flags: 'w' });
          await finished(Readable.fromWeb(res.body).pipe(fileStream));
        });       
        await downloadFile(data.imageurl, data.imagename);
    });
}

module.exports = async function () {
    console.log(">>> Checking for new notes...");
    if(process.env.NODE_ENV == "development" && !metadata.fetchall) { // fetchall değişkeni src/_data/site.json dosyasında manual switch
        const readNotes = await fs.promises.readFile(PUBLISHEDNOTES_CACHE_FILE_PATH);
        const publishedNotes = JSON.parse(readNotes)
        publishedNotes.forEach(async (note) => {
            const imagename = `${note.sort}-${slugify(note.name, slugOptions)}`;
            note.image[0] = path.resolve(__CACHEFOLDER, `${imagename}.png`);
        });
        console.log("publishedNotes: ", publishedNotes);
        return publishedNotes;
    } else {
        const newNotes = await fetchNotes();
        //console.log("newNotes: ", newNotes);
        const publishedNotes = processAndReturn(newNotes);
        console.log("publishedNotes: ", publishedNotes);

        if(process.env.NODE_ENV == "development") {
            await writeAllImagesToFolder(publishedNotes);
            console.log('NOTES IMAGES WRITTEN!');
    
            await fs.promises.writeFile(PUBLISHEDNOTES_CACHE_FILE_PATH, JSON.stringify(publishedNotes, null, 2));
            console.log('publishedNotes.json IS WRITTEN!');
        }

        return publishedNotes;
    }
};
