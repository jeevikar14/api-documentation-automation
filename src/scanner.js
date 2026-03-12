const fs = require("fs");
const path = require("path");
const parseFile = require("./parser");

function scanDirectory(directory)
{
    let results = [];

    const items = fs.readdirSync(directory);

    for (const item of items)
    {
        const fullPath = path.join(directory, item);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory())
        {
            results = results.concat(scanDirectory(fullPath));
        }
        else if (stats.isFile() && fullPath.endsWith(".js"))
        {
            const parsedDocs = parseFile(fullPath);
            if (parsedDocs.length)
            {
                results = results.concat(parsedDocs);
            }
        }
    }

    return results;
}

module.exports = scanDirectory;