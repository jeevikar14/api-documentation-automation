const fs = require("fs");
const { createRequestValidator } = require("../validator/validateRequest");

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

        if (options.command === "validate")
        {
            return this.#runValidation(openApiSpec, options);
        }

        const output = this.docsGenerator.generate(openApiSpec, options);

        this.logger.log("Endpoints documented:", output.endpointCount);
        this.logger.log("Swagger UI generated at:", output.htmlPath);
        this.logger.log("OpenAPI JSON generated at:", output.jsonPath);

        return output;
    }

    #runValidation(openApiSpec, options)
    {
        const request = this.#readValidationRequest(options);
        const validator = createRequestValidator({ spec: openApiSpec });
        const result = validator.validate(request);
        const endpointLabel = this.#formatEndpointLabel(result.matchedEndpoint, request);

        if (result.isValid)
        {
            this.logger.log(`Validation passed for ${endpointLabel}.`);
            this.logger.log(`Endpoint: ${endpointLabel}`);
        }
        else
        {
            this.logger.error("Validation failed:");
            this.logger.error(`Endpoint: ${endpointLabel}`);
            this.logger.error("Errors:");

            for (let index = 0; index < result.errors.length; index += 1)
            {
                this.logger.error(`${index + 1}. ${result.errors[index]}`);
            }
        }

        return {
            mode: "validate",
            ...result
        };
    }

    #readValidationRequest(options)
    {
        if (options.request)
        {
            try
            {
                return JSON.parse(options.request);
            }
            catch (error)
            {
                throw new Error("Invalid JSON in --request option.");
            }
        }

        if (options.requestFile)
        {
            if (!fs.existsSync(options.requestFile))
            {
                throw new Error(`Request file not found: ${options.requestFile}`);
            }

            try
            {
                const raw = fs.readFileSync(options.requestFile, "utf8");
                return JSON.parse(raw);
            }
            catch (error)
            {
                throw new Error(`Invalid JSON in request file: ${options.requestFile}`);
            }
        }

        throw new Error("Request input is required for validation. Use --request or --requestFile.");
    }

    #formatEndpointLabel(matchedEndpoint, request)
    {
        const method = matchedEndpoint && matchedEndpoint.method
            ? String(matchedEndpoint.method).toUpperCase()
            : String(request.method || "").toUpperCase();
        const path = matchedEndpoint && matchedEndpoint.path
            ? matchedEndpoint.path
            : String(request.path || "");

        if (method && path)
        {
            return `${method} ${path}`;
        }

        return "Unknown endpoint";
    }
}

module.exports = DocumentationApp;