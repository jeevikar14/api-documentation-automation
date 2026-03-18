const CliArgumentParser = require("./CliArgumentParser");
const DocumentationApp = require("../application/DocumentationApp");
const FileScanner = require("../scanner/FileScanner");
const SpecBuilder = require("../parser/SpecBuilder");
const DocsGenerator = require("../generator/DocsGenerator");

function createArgumentParser()
{
    return new CliArgumentParser();
}

function createApplication()
{
    return new DocumentationApp({
        argumentParser: createArgumentParser(),
        fileScanner: new FileScanner(),
        specBuilder: new SpecBuilder(),
        docsGenerator: new DocsGenerator()
    });
}

function main(argv = getProcessArguments())
{
    return createApplication().run(argv);
}

function getProcessArguments()
{
    const argumentParser = createArgumentParser();
    return argumentParser.getProcessArguments(process.argv);
}

function parseCommandLineArgs(argv)
{
    const argumentParser = createArgumentParser();
    return argumentParser.parse(argv);
}

if (require.main === module)
{
    try
    {
        main();
    }
    catch (error)
    {
        console.error("Documentation generation failed:", error.message);
        process.exitCode = 1;
    }
}

module.exports = {
    main,
    parseCommandLineArgs
};
