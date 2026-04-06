const fs = require("fs");
const packageJson = require("../../package.json");
const { createRequestValidator } = require("../validator/validateRequest");
const { createResponseValidator } = require("../validator/validateResponse");

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

        if (options.showHelp)
        {
            this.#printHelp();
            return { mode: "help" };
        }

        if (options.showVersion)
        {
            this.#printVersion();
            return { mode: "version" };
        }

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

        let validationOutput = {
            mode: "validate",
            ...result
        };

        if (options.response || options.responseFile)
        {
            const response = this.#readValidationResponse(options);
            const responseValidator = createResponseValidator({ spec: openApiSpec });
            const responseResult = responseValidator.validate(response, {
                context: {
                    path: result.matchedEndpoint?.path,
                    method: result.matchedEndpoint?.method
                }
            });

            this.logger.log("");

            if (responseResult.isValid)
            {
                this.logger.log(`Response validation passed for ${endpointLabel}.`);
            }
            else
            {
                this.logger.error("Response validation failed:");
                this.logger.error("Errors:");

                for (let index = 0; index < responseResult.errors.length; index += 1)
                {
                    this.logger.error(`${index + 1}. ${responseResult.errors[index]}`);
                }
            }

            validationOutput.responseValidation = responseResult;
        }

        return validationOutput;
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

    #readValidationResponse(options)
    {
        if (options.response)
        {
            try
            {
                return JSON.parse(options.response);
            }
            catch (error)
            {
                throw new Error("Invalid JSON in --response option.");
            }
        }

        if (options.responseFile)
        {
            if (!fs.existsSync(options.responseFile))
            {
                throw new Error(`Response file not found: ${options.responseFile}`);
            }

            try
            {
                const raw = fs.readFileSync(options.responseFile, "utf8");
                return JSON.parse(raw);
            }
            catch (error)
            {
                throw new Error(`Invalid JSON in response file: ${options.responseFile}`);
            }
        }

        throw new Error("Response input is required. Use --response or --responseFile.");
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

    #printVersion()
    {
        this.logger.log(`hiveapidocumenter ${packageJson.version}`);
    }

    #printHelp()
    {
        this.logger.log("Usage:");
        this.logger.log("  hiveapidocumenter [targetDir] [--output=<dir>] [--title=<text>] [--version=<semver>] [--description=<text>]");
        this.logger.log("  hiveapidocumenter validate [targetDir] --requestFile=<file> [--responseFile=<file>]");
        this.logger.log("  hiveapidocumenter validate [targetDir] --request=<json> [--response=<json>]");
        this.logger.log("  hiveapidocumenter --help");
        this.logger.log("  hiveapidocumenter --version");
    }
}

module.exports = DocumentationApp;