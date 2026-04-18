const fs = require("fs");
const packageJson = require("../../package.json");
const
{ createRequestValidator } = require("../validator/RequestValidation");
const
{ createContractValidator } = require("../validator/ContractValidation");
const PortalClient = require("../cli/PortalClient");
const
{ PORTAL_URLS, PORTAL_ENDPOINTS, DEFAULTS, PAYLOAD_FIELDS } = require("../constants");

class DocumentationApp
{
    constructor( { argumentParser, fileScanner, specBuilder, docsGenerator, logger = console })
    {

        this.argumentParser = argumentParser;
        this.fileScanner = fileScanner;
        this.specBuilder = specBuilder;
        this.docsGenerator = docsGenerator;
        this.logger = logger;
    }

    async run(argv)
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

        if (options.publishApproval)
        {
            const portalUrls = [];
            if (options.portalUrl) portalUrls.push(options.portalUrl);
            if (process.env.HIVE_PORTAL_URL) portalUrls.push(process.env.HIVE_PORTAL_URL);
            for (const url of PORTAL_URLS)
            {
                if (!portalUrls.includes(url)) portalUrls.push(url);
            }

            const portalEndpoint = options.portalEndpoint || PORTAL_ENDPOINTS.PUBLISH_DOCUMENTATION_REQUEST;
            const serviceName = options.serviceName || packageJson.name || options.title || DEFAULTS.SERVICE_NAME;
            const version = options.version || DEFAULTS.VERSION;
            const htmlContent = fs.readFileSync(output.htmlPath, "utf8");
            const headers = {};
            if (options.portalAuthToken)
            {
                headers.Authorization = `Bearer ${options.portalAuthToken}`;
            }
            headers["x-device-id"] = options.deviceId || DEFAULTS.DEVICE_ID;
            const payload = {};
            payload[PAYLOAD_FIELDS.SERVICE_NAME] = serviceName;
            payload[PAYLOAD_FIELDS.DOCUMENTATION_HTML] = htmlContent;

            let published = false;
            let lastError = null;
            for (const baseUrl of portalUrls)
            {
                const targetUrl = baseUrl.replace(/\/$/, "") + portalEndpoint;
                try
                {
                    const result = await PortalClient.postJson(targetUrl, payload, headers);
                    this.logger.log(`Publish request to ${targetUrl} -> status ${result.statusCode}`);
                    this.logger.log(`Publish response body: ${result.body}`);
                    published = true;
                    break;
                }
catch (err)
                {
                    this.logger.error(`Portal POST failed [${targetUrl}]:`, err.message || err);
                    lastError = err;
                }
            }
            if (!published && lastError)
            {
                this.logger.error("All portal publish attempts failed.", lastError.message || lastError);
            }
        }

        return output;
    }

    #runValidation(openApiSpec, options)
    {
        const request = this.#readValidationRequest(options);
        const hasResponseInput = Boolean(options.response || options.responseFile);

        if (!hasResponseInput)
        {
            const requestValidator = createRequestValidator( { spec: openApiSpec });
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
        const contractValidator = createContractValidator( { spec: openApiSpec });
        const contractResult = contractValidator.validate( { request, response });
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
