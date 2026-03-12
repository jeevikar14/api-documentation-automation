const path = require("path")
const scanDirectory = require("./scanner")
const generateDocs = require("./generator")

function main() {
    const args = process.argv.slice(2)
    let targetDir = process.cwd()
    
    // Parse arguments: --key=value format, or treat non-matching args as directory
    for (const arg of args) {
        if (!arg.startsWith('--')) {
            // This is the scanning directory
            targetDir = path.resolve(arg)
            break
        }
        // Handle --key=value arguments here as needed
    }

    console.log("Scanning directory:", targetDir)

    const docs = scanDirectory(targetDir)

    console.log("OpenAPI blocks found:", docs.length)

    generateDocs(docs)
}

main()