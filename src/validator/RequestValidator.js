const RefResolver = require("./RefResolver");
const SchemaValidator = require("./SchemaValidator");

class RequestValidator
{
    constructor(openApiSpec = {})
    {
        this.openApiSpec = openApiSpec;
        this.refResolver = new RefResolver(openApiSpec);
        this.schemaValidator = new SchemaValidator(this.refResolver);
    }

    validate(request)
    {
        const normalizedRequest = this.#normalizeRequest(request);
        const errors = [];

        const pathMatch = this.#matchPath(normalizedRequest.path);

        if (!pathMatch)
        {
            return {
                isValid: false,
                errors: ["No matching OpenAPI path found for request path."],
                matchedEndpoint: null
            };
        }

        const pathItem = this.refResolver.resolveReferenceObject(pathMatch.pathItem) || {};
        const operation = this.refResolver.resolveReferenceObject(pathItem[normalizedRequest.method]);

        if (!operation)
        {
            return {
                isValid: false,
                errors: [
                    `Path '${pathMatch.templatePath}' exists, but method '${normalizedRequest.method.toUpperCase()}' is not defined.`
                ],
                matchedEndpoint: {
                    path: pathMatch.templatePath,
                    method: normalizedRequest.method
                }
            };
        }

        const parameters = this.#collectParameters(pathItem, operation);
        this.#validateParameters(parameters, normalizedRequest, pathMatch.pathParams, errors);
        this.#validateRequestBody(operation, normalizedRequest.body, errors);

        return {
            isValid: errors.length === 0,
            errors,
            matchedEndpoint: {
                path: pathMatch.templatePath,
                method: normalizedRequest.method
            }
        };
    }

    #normalizeRequest(request)
    {
        if (!request || typeof request !== "object")
        {
            throw new Error("Request must be an object.");
        }

        const rawPath = String(request.path || "").trim();

        if (!rawPath)
        {
            throw new Error("Request.path is required.");
        }

        const [pathWithoutQuery] = rawPath.split("?");
        const method = String(request.method || "").trim().toLowerCase();

        if (!method)
        {
            throw new Error("Request.method is required.");
        }

        return {
            method,
            path: this.#normalizePath(pathWithoutQuery),
            query: this.#normalizePlainObject(request.query),
            headers: this.#normalizeHeaders(request.headers),
            body: request.body
        };
    }

    #normalizeHeaders(headers)
    {
        const normalized = {};
        const source = this.#normalizePlainObject(headers);

        for (const [key, value] of Object.entries(source))
        {
            normalized[String(key).toLowerCase()] = value;
        }

        return normalized;
    }

    #normalizePlainObject(value)
    {
        if (!value)
        {
            return {};
        }

        return typeof value === "object" && !Array.isArray(value) ? value : {};
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

    #splitPath(pathValue)
    {
        const normalized = this.#normalizePath(pathValue);

        if (normalized === "/")
        {
            return [];
        }

        return normalized.slice(1).split("/");
    }

    #collectParameters(pathItem, operation)
    {
        const pathParameters = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];
        const operationParameters = Array.isArray(operation.parameters) ? operation.parameters : [];
        return [...pathParameters, ...operationParameters];
    }

    #validateParameters(parameters, request, pathParams, errors)
    {
        for (const parameter of parameters)
        {
            const resolvedParameter = this.refResolver.resolveReferenceObject(parameter) || {};
            const parameterName = resolvedParameter.name;
            const parameterIn = resolvedParameter.in;
            const isRequired = Boolean(resolvedParameter.required);

            if (!parameterName || !parameterIn)
            {
                continue;
            }

            let value;

            if (parameterIn === "path")
            {
                value = pathParams[parameterName];
            }
            else if (parameterIn === "query")
            {
                value = request.query[parameterName];
            }
            else if (parameterIn === "header")
            {
                value = request.headers[String(parameterName).toLowerCase()];
            }

            if (isRequired && value === undefined)
            {
                errors.push(`Missing required ${parameterIn} parameter '${parameterName}'.`);
                continue;
            }

            if (value !== undefined)
            {
                const schema = resolvedParameter.schema || {};
                this.schemaValidator.validate(value, schema, `${parameterIn}.${parameterName}`, errors, true);
            }
        }
    }

    #validateRequestBody(operation, requestBody, errors)
    {
        const resolvedRequestBody = this.refResolver.resolveReferenceObject(operation.requestBody);

        if (!resolvedRequestBody)
        {
            return;
        }

        const bodyRequired = Boolean(resolvedRequestBody.required);

        if (requestBody === undefined)
        {
            if (bodyRequired)
            {
                errors.push("Missing required request body.");
            }

            return;
        }

        const content = resolvedRequestBody.content || {};
        const jsonContent = content["application/json"] || content["application/*+json"];

        if (!jsonContent || !jsonContent.schema)
        {
            return;
        }

        this.schemaValidator.validate(requestBody, jsonContent.schema, "body", errors, false);
    }
}

module.exports = RequestValidator;
