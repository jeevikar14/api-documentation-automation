const CliArgumentParser = require("./CliArgumentParser");
const DocumentationApp = require("../application/DocumentationApp");
const FileScanner = require("../scanner/FileScanner");
const SpecBuilder = require("../parser/SpecBuilder");
const DocsGenerator = require("../generator/DocsGenerator");

class Cli
{
    static #createArgumentParser()
    {
        return new CliArgumentParser();
    }

    static #createApplication()
    {
        return new DocumentationApp( {
            argumentParser: Cli.#createArgumentParser(),
            fileScanner: new FileScanner(),
            specBuilder: new SpecBuilder(),
            docsGenerator: new DocsGenerator()
        });
    }

    static async main(argv = Cli.getProcessArguments()) {

        const output = await Cli.#createApplication().run(argv);

        if (output && Object.prototype.hasOwnProperty.call(output, "isValid") && !output.isValid)
        {
            process.exitCode = 1;
        }

        return output;
    }

    static getProcessArguments()
    {
        const argumentParser = Cli.#createArgumentParser();
        return argumentParser.getProcessArguments(process.argv);
    }

    static parseCommandLineArgs(argv)
    {
        const argumentParser = Cli.#createArgumentParser();
        return argumentParser.parse(argv);
    }
}

module.exports = {
    main: Cli.main,
    parseCommandLineArgs: Cli.parseCommandLineArgs
};
