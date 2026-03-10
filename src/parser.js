const fs = require("fs")

function parseFile(filePath) {
    const content = fs.readFileSync(filePath, "utf8")

    const regex = /\/\*\*([\s\S]*?)\*\//g

    let match
    const docs = []

    while ((match = regex.exec(content)) !== null) {
        const block = match[1]

        if (block.includes("@openapi")) {
            docs.push({
                file: filePath,
                content: block.trim()
            })
        }
    }

    return docs
}

module.exports = parseFile