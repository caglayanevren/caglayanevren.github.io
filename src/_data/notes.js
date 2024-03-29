/**
 * From https://github.com/thiagomgd/eleventy_notion_starter
 */

const { fetchFromNotion, getNotionProps } = require("../_11ty/notionHelpers");
require("dotenv").config({ path: "../../.env" });
const { Client } = require("@notionhq/client");

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
        //info: note.info,
        image: note.image,
        content: note.content,
    };
};

/* const getEmbed = (note) => {
    return note.properties.Embed.url;
}; */

/* const getFormat = (note) => {
    return note.properties.Format.select ? note.properties.Format.select.name : "text";
}; */

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

module.exports = async function () {
    console.log(">>> Checking for new notes...");
    const newNotes = await fetchNotes();

    console.log("newNotes: ", newNotes);
    const publishedNotes = processAndReturn(newNotes);
    console.log("publishedNotes: ", publishedNotes);
    return publishedNotes;
};
