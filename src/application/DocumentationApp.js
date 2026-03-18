class DocumentationApp
{
    constructor({ argumentParser, fileScanner, specBuilder, docsGenerator, logger = console })
    {
        this.argumentParser = argumentParser;
        this.fileScanner = fileScanner;
        this.specBuilder = specBuilder;
        this.docsGenerator = docsGenerator;
        this.logger = logger;
    }

    run(argv)
    {
        const options = this.argumentParser.parse(argv);
        const apiFiles = this.fileScanner.scan(options.targetDir);

        this.logger.log("Scanning directory:", options.targetDir);
        this.logger.log("JavaScript files found:", apiFiles.length);

        const openApiSpec = this.specBuilder.build(apiFiles, options);
        const output = this.docsGenerator.generate(openApiSpec, options);

        this.logger.log("Endpoints documented:", output.endpointCount);
        this.logger.log("Swagger UI generated at:", output.htmlPath);
        this.logger.log("OpenAPI JSON generated at:", output.jsonPath);

        return output;
    }
}

module.exports = DocumentationApp;