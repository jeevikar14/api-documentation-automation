const path = require("path");
const
{ PORTAL_URLS, PORTAL_ENDPOINTS, DEFAULTS } = require("../constants");

class CliArgumentParser
{
    static #defaultOptions = Object.freeze( {
        command: "generate",
        targetDir: process.cwd(),
        outputDir: path.join(process.cwd(), "output"),
        title: "API Documentation",
        version: DEFAULTS.VERSION,
        description: "Auto-generated API documentation",
        request: "",
        requestFile: "",
        response: "",
        responseFile: "",
        showHelp: false,
        showVersion: false,
        portalUrl: PORTAL_URLS[1], 
        portalEndpoint: PORTAL_ENDPOINTS.PUBLISH_DOCUMENTATION_REQUEST,
        portalAuthToken: "",
        publishApproval: false,
        serviceName: DEFAULTS.SERVICE_NAME
    });

    constructor(defaultOptions = {})
    {

        this.defaultOptions = {
            ...CliArgumentParser.#defaultOptions,
            ...defaultOptions
        };
    }

    parse(argv)
    {
        const options = { ...this.defaultOptions };
        const positionalArgs = [];

        for (const arg of argv)
        {
            if (this.#isFlagOption(arg))
            {
                this.#assignFlagOption(options, arg);
                continue;
            }

            if (this.#isKeyValueOption(arg))
            {
                const [key, value] = this.#splitKeyValueOption(arg);
                this.#assignOption(options, key, value);
                continue;
            }

            positionalArgs.push(arg);
        }

        const commandIndex = positionalArgs.findIndex((value) => value === "validate" || value === "generate");

        if (commandIndex >= 0)
        {
            options.command = positionalArgs[commandIndex];
            positionalArgs.splice(commandIndex, 1);
        }

        if (positionalArgs[0])
        {
            options.targetDir = path.resolve(positionalArgs[0]);
        }

        options.outputDir = path.resolve(options.outputDir);
        options.targetDir = path.resolve(options.targetDir);

        if (options.requestFile)
        {
            options.requestFile = path.resolve(options.requestFile);
        }

        if (options.responseFile)
        {
            options.responseFile = path.resolve(options.responseFile);
        }

        return options;
    }

    getProcessArguments(runtimeArgs = process.argv)
    {

        const args = Array.isArray(runtimeArgs) ? runtimeArgs.slice(1) : [];

        if (args.length === 0)
        {
            return [];
        }

        if (this.#looksLikeScriptReference(args[0]))
        {
            return args.slice(1);
        }

        return args;
    }

    #isKeyValueOption(arg)
    {
        return /^--[^=]+=.+$/.test(arg);
    }

    #isFlagOption(arg)
    {
        return arg === "--help" || arg === "-h" || arg === "--version" || arg === "-v";
    }

    #splitKeyValueOption(arg)
    {
        const optionText = arg.slice(2);
        const separatorIndex = optionText.indexOf("=");
        const key = optionText.slice(0, separatorIndex).trim();
        const value = optionText.slice(separatorIndex + 1).trim();
        return [key, value];
    }

    #assignOption(options, key, value)
    {
        switch (key)
        {
            case "output":
                options.outputDir = value;
                break;
            case "title":
                options.title = value;
                break;
            case "version":
                options.version = value;
                break;
            case "description":
                options.description = value;
                break;
            case "request":
                options.request = value;
                break;
            case "requestFile":
                options.requestFile = value;
                break;
            case "response":
                options.response = value;
                break;
            case "responseFile":
                options.responseFile = value;
                break;
            case "portalUrl":
                options.portalUrl = value;
                break;
            case "portalEndpoint":
                options.portalEndpoint = value;
                break;
            case "portalAuthToken":
                options.portalAuthToken = value;
                break;
            case "publishApproval":
                options.publishApproval = (value === "true" || value === "1");
                break;
            case "serviceName":
                options.serviceName = value;
                break;
            default:
                break;
        }
    }

    #assignFlagOption(options, flag)
    {
        if (flag === "--help" || flag === "-h")
        {
            options.showHelp = true;
        }

        if (flag === "--version" || flag === "-v")
        {
            options.showVersion = true;
        }
    }

    #looksLikeScriptReference(value)
    {
        if (!value)
        {
            return false;
        }

        return /\.(cjs|mjs|js)$/i.test(value);
    }
}

module.exports = CliArgumentParser;
