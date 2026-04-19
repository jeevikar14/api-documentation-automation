const ReferenceResolver = require("./ReferenceResolver");
const SchemaValidator = require("./SchemaValidator");

class ResponseValidator
{
    constructor(openApiSpec = {})
    {

        this.openApiSpec = openApiSpec;
        this.refResolver = new ReferenceResolver(openApiSpec);
        this.schemaValidator = new SchemaValidator(this.refResolver);
    }

    validate(response, context)
    {
        const normalized = this.#normalizeInput(response, context);
        const errors = [];

        const pathMatch = this.#matchPath(normalized.path);

        if (!pathMatch)
        {
            return {
                isValid: false,
                errors: ["No matching OpenAPI path found for response path."],
                matchedEndpoint: null
            };
        }

        const pathItem = this.refResolver.resolveReferenceObject(pathMatch.pathItem) || {};
        const operation = this.refResolver.resolveReferenceObject(pathItem[normalized.method]);

        if (!operation)
        {
            return {
                isValid: false,
                errors: [
                    `Path '${pathMatch.templatePath}' exists, but method '${normalized.method.toUpperCase()}' is not defined.`
                ],
                matchedEndpoint: {
                    path: pathMatch.templatePath,
                    method: normalized.method
                }
            };
        }

        this.#validateResponse(operation, normalized, errors);

        return {
            isValid: errors.length === 0,
            errors,
            matchedEndpoint: {
                path: pathMatch.templatePath,
                method: normalized.method
            }
        };
    }

    #normalizeInput(response, context = {})
    {

        const effectiveContext = context && typeof context === "object" && context.context
            ? context.context
            : context;

        if (!response || typeof response !== "object")
        {
            throw new Error("Response must be an object.");
        }

        const rawPath = String((effectiveContext.path || response.path) || "").trim();

        if (!rawPath)
        {
            throw new Error("path is required in context or response.");
        }

        const [pathWithoutQuery] = rawPath.split("?");
        const method = String((effectiveContext.method || response.method) || "").trim().toLowerCase();

        if (!method)
        {
            throw new Error("method is required in context or response.");
        }

        const status = response.status || response.statusCode;

        if (status === undefined || status === null)
        {
            throw new Error("response.status or response.statusCode is required.");
        }

        return {
            method,
            path: this.#normalizePath(pathWithoutQuery),
            status: String(status),
            headers: this.#normalizeHeaders(response.headers),
            body: response.body
        };
    }

    #normalizeHeaders(headers)
    {
        const normalized = {};
        const source = typeof headers === "object" && headers ? headers : {};

        for (const [key, value] of Object.entries(source))
        {
            normalized[String(key).toLowerCase()] = value;
        }

        return normalized;
    }

    #normalizePath(pathValue)
    {
        const trimmed = String(pathValue || "").trim();

        if (!trimmed)
        {
            return "/";
        }

        const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
        return withLeadingSlash.replace(/\/+$/, "") || "/";
    }

    #splitPath(pathValue)
    {
        const normalized = this.#normalizePath(pathValue);

        if (normalized === "/")
        {
            return [];
        }

        return normalized.slice(1).split("/");
    }

    #matchPath(requestPath)
    {
        const openApiPaths = this.openApiSpec.paths || {};
        const requestSegments = this.#splitPath(requestPath);

        for (const [templatePath, pathItem] of Object.entries(openApiPaths))
        {
            const templateSegments = this.#splitPath(templatePath);

            if (templateSegments.length !== requestSegments.length)
            {
                continue;
            }

            const pathParams = {};
            let matches = true;

            for (let index = 0; index < templateSegments.length; index += 1)
            {
                const templateSegment = templateSegments[index];
                const requestSegment = requestSegments[index];
                const templateMatch = templateSegment.match(/^\{(.+)\}$/);

                if (templateMatch)
                {
                    pathParams[templateMatch[1]] = requestSegment;
                    continue;
                }

                if (templateSegment !== requestSegment)
                {
                    matches = false;
                    break;
                }
            }

            if (matches)
            {
                return {
                    templatePath,
                    pathItem,
                    pathParams
                };
            }
        }

        return null;
    }

    #validateResponse(operation, normalized, errors)
    {
        const responses = operation.responses || {};
        const responseDef = this.refResolver.resolveReferenceObject(responses[normalized.status]) || this.refResolver.resolveReferenceObject(responses.default);

        if (!responseDef)
        {
            errors.push(`No response definition found for status '${normalized.status}'.`);
            return;
        }

        const headersDef = responseDef.headers || {};

        for (const [headerName, headerSchemaObj] of Object.entries(headersDef))
        {
            const resolvedHeader = this.refResolver.resolveReferenceObject(headerSchemaObj) || {};
            const schema = resolvedHeader.schema || {};
            const value = normalized.headers[String(headerName).toLowerCase()];

            if (resolvedHeader.required && value === undefined)
            {
                errors.push(`Missing required response header '${headerName}'.`);
                continue;
            }

            if (value !== undefined)
            {
                this.schemaValidator.validate(value, schema, `header.${headerName}`, errors, true);
            }
        }

        const content = responseDef.content || {};
        const jsonContent = content["application/json"] || content["application/*+json"];

        if (jsonContent && jsonContent.schema)
        {
            this.schemaValidator.validate(normalized.body, jsonContent.schema, "body", errors, false);
        }
    }
}

module.exports = ResponseValidator;
