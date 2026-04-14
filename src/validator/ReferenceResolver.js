class ReferenceResolver
{
    constructor(openApiSpec = {})
    {
        this.openApiSpec = openApiSpec;
    }

    resolveReferenceObject(source)
    {
        if (!source || typeof source !== "object")
        {
            return source;
        }

        let resolved = source;

        while (resolved && typeof resolved === "object" && resolved.$ref)
        {
            const refTarget = this.#resolvePointer(resolved.$ref);
            const { $ref, ...overrides } = resolved;
            resolved = {
                ...refTarget,
                ...overrides
            };
        }

        return resolved;
    }

    #resolvePointer(pointer)
    {
        if (typeof pointer !== "string" || !pointer.startsWith("#/"))
        {
            throw new Error(`Unsupported $ref pointer: ${pointer}`);
        }

        const parts = pointer
            .slice(2)
            .split("/")
            .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));

        let current = this.openApiSpec;

        for (const part of parts)
        {
            if (!current || typeof current !== "object" || !Object.prototype.hasOwnProperty.call(current, part))
            {
                throw new Error(`Unable to resolve $ref pointer: ${pointer}`);
            }

            current = current[part];
        }

        return current;
    }
}

module.exports = ReferenceResolver;
