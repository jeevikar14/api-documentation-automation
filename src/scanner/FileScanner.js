const fs = require("fs");
const path = require("path");

const DEFAULT_IGNORED_DIRECTORIES = [".git", "node_modules", "output"];
const DEFAULT_SUPPORTED_EXTENSIONS = [".js", ".cjs", ".mjs"];

class FileScanner
{
    constructor(options = {})
    {
        this.ignoredDirectories = new Set(options.ignoredDirectories || DEFAULT_IGNORED_DIRECTORIES);
        this.supportedExtensions = new Set(options.supportedExtensions || DEFAULT_SUPPORTED_EXTENSIONS);
    }

    scan(directoryPath)
    {
        const files = [];
        this.#walk(path.resolve(directoryPath), files);
        return files;
    }

    #walk(directoryPath, files)
    {
        const entries = fs.readdirSync(directoryPath, { withFileTypes: true });

        for (const entry of entries)
        {
            const fullPath = path.join(directoryPath, entry.name);

            if (entry.isDirectory())
            {
                if (!this.ignoredDirectories.has(entry.name))
                {
                    this.#walk(fullPath, files);
                }

                continue;
            }

            if (entry.isFile() && this.supportedExtensions.has(path.extname(entry.name)))
            {
                files.push(fullPath);
            }
        }
    }
}

module.exports = FileScanner;
