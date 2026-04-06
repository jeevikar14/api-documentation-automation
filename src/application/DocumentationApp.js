const fs = require("fs");
const packageJson = require("../../package.json");
const { createRequestValidator } = require("../validator/validateRequest");
const { createContractValidator } = require("../validator/validateContract");

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
        const hasResponseInput = Boolean(options.response || options.responseFile);

        if (!hasResponseInput)
        {
            const requestValidator = createRequestValidator({ spec: openApiSpec });
            const requestResult = requestValidator.validate(request);
            const endpointLabel = this.#formatEndpointLabel(requestResult.matchedEndpoint, request);

            this.logger.log(requestResult.isValid ? "✔ Request validation passed" : "❌ Request validation failed");
            this.logger.log(`Endpoint: ${endpointLabel}`);

            if (!requestResult.isValid)
            {
                this.#printErrors(requestResult.errors || []);
            }

            this.logger.log("");
            this.logger.log("ℹ Response validation skipped (no response input provided)");

            return {
                mode: "validate",
                ...requestResult,
                responseValidation: {
                    isValid: true,
                    skipped: true,
                    errors: []
                }
            };
        }

        const response = this.#readValidationResponse(options);
        const contractValidator = createContractValidator({ spec: openApiSpec });
        const contractResult = contractValidator.validate({ request, response });
        const endpointLabel = this.#formatEndpointLabel(contractResult.matchedEndpoint, request);

        this.logger.log(
            contractResult.requestValidation && contractResult.requestValidation.isValid
                ? "✔ Request validation passed"
                : "❌ Request validation failed"
        );
        this.logger.log(`Endpoint: ${endpointLabel}`);

        if (contractResult.requestValidation && !contractResult.requestValidation.isValid)
        {
            this.#printErrors(contractResult.requestValidation.errors || []);
        }

        this.logger.log("");

        if (contractResult.responseValidation && contractResult.responseValidation.skipped)
        {
            this.logger.error("❌ Response validation skipped");
        }
        else if (contractResult.responseValidation && contractResult.responseValidation.isValid)
        {
            this.logger.log("✔ Response validation passed");
        }
        else
        {
            this.logger.error("❌ Response validation failed");
            this.#printErrors((contractResult.responseValidation && contractResult.responseValidation.errors) || []);
        }

        return {
            mode: "validate",
            ...contractResult
        };
    }

    #printErrors(errors)
    {
        if (!errors.length)
        {
            return;
        }

        this.logger.error("Errors:");

        for (let index = 0; index < errors.length; index += 1)
        {
            this.logger.error(`${index + 1}. ${errors[index]}`);
        }
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