const fs = require("fs")
const path = require("path")

function generateDocs(docs) {
    const outputDir = path.join(process.cwd(), "output")

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir)
    }

    let html = `
<html>
<head>
<title>API Documentation</title>
<style>
body{font-family:Arial;padding:40px}
pre{background:#f4f4f4;padding:12px;border-radius:6px}
</style>
</head>
<body>
<h1>OpenAPI Documentation</h1>
`

    docs.forEach(doc => {
        html += `
<h3>${doc.file}</h3>
<pre>${doc.content}</pre>
`
    })

    html += `
</body>
</html>
`

    const outputPath = path.join(outputDir, "documentation.html")

    fs.writeFileSync(outputPath, html)

    console.log("Documentation generated at:", outputPath)
}

module.exports = generateDocs