const path = require("path")
const scanDirectory = require("./scanner")
const generateDocs = require("./generator")

function main() {
    const dirArg = process.argv[2]
    const targetDir = dirArg ? path.resolve(dirArg) : process.cwd()

    console.log("Scanning directory:", targetDir)

    const docs = scanDirectory(targetDir)

    console.log("OpenAPI blocks found:", docs.length)

    generateDocs(docs)
}

main()