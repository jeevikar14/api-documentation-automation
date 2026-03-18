const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

class DocsGenerator
{
    generate(openApiSpec, options)
    {
        const outputDir = path.resolve(options.outputDir || path.join(process.cwd(), "output"));
        fs.mkdirSync(outputDir, { recursive: true });

        const jsonPath = path.join(outputDir, "openapi-spec.json");
        const yamlPath = path.join(outputDir, "openapi-spec.yaml");
        const htmlPath = path.join(outputDir, "documentation.html");

        fs.writeFileSync(jsonPath, JSON.stringify(openApiSpec, null, 2));
        fs.writeFileSync(yamlPath, yaml.dump(openApiSpec, { noRefs: true }));
        fs.writeFileSync(htmlPath, this.#buildHtml(openApiSpec, options.title));

        return {
            outputDir,
            jsonPath,
            yamlPath,
            htmlPath,
            endpointCount: this.#countEndpoints(openApiSpec.paths || {})
        };
    }

    #buildHtml(openApiSpec, pageTitle)
    {
        const serializedSpec = JSON.stringify(openApiSpec, null, 2).replace(/</g, "\\u003c");

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.#escapeHtml(pageTitle)} - Swagger UI</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
    <style>
        html,
        body {
            margin: 0;
            padding: 0;
            background: #f6f8fb;
        }

        #swagger-ui {
            max-width: 1440px;
            margin: 0 auto;
        }

        .topbar {
            display: none;
        }
        .opblock .try-out,
        .opblock .opblock-execute,
        .execute-wrapper,
        .btn.execute,
        .try-out__btn,
        .opblock-execute,
        .opblock .execute {
            display: none !important;
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>

    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function ()
        {
            const spec = ${serializedSpec};

            window.ui = SwaggerUIBundle({
                spec,
                dom_id: "#swagger-ui",
                supportedSubmitMethods: [],
                deepLinking: true,
                docExpansion: "list",
                defaultModelsExpandDepth: -1,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                layout: "StandaloneLayout"
            });

            try
            {
                document.querySelectorAll('.opblock .try-out, .opblock .opblock-execute, .execute-wrapper, .btn.execute, .try-out__btn, .opblock-execute').forEach(el => el.remove());
                document.querySelectorAll('button').forEach(btn => {
                    try
                    {
                        const txt = (btn.textContent || btn.innerText || '').trim();
                        if (/try it out/i.test(txt))
                        {
                            btn.remove();
                        }
                    }
                    catch (e)
                    {
                    }
                });
            }
            catch (e)
            {
            }

            try
            {
                const target = document.getElementById('swagger-ui');
                if (target)
                {
                    const observer = new MutationObserver(mutations =>
                    {
                        for (const m of mutations)
                        {
                            for (const node of Array.from(m.addedNodes || []))
                            {
                                try
                                {
                                    if (node.nodeType === Node.ELEMENT_NODE)
                                    {
                                        const el = node;
                                        if ((el.tagName === 'BUTTON' && /try it out/i.test((el.textContent||el.innerText||'').trim())) || (el.matches && el.matches('.try-out, .opblock-execute, .try-out__btn, .btn.execute, .opblock .try-out, .opblock .opblock-execute')))
                                        {
                                            el.remove();
                                        }
                                        el.querySelectorAll && el.querySelectorAll('button').forEach(b =>
                                        {
                                            try
                                            {
                                                if (/try it out/i.test((b.textContent||b.innerText||'').trim()))
                                                {
                                                    b.remove();
                                                }
                                            }
                                            catch (e)
                                            {
                                            }
                                        });
                                    }
                                }
                                catch (e)
                                {
                                }
                            }
                        }
                    });
                    observer.observe(target, { childList: true, subtree: true });
                    setTimeout(() => observer.disconnect(), 10000);
                }
            }
            catch (e)
            {
            }
        };
    </script>
</body>
</html>
`;
    }

    #countEndpoints(paths)
    {
        return Object.values(paths).reduce((count, pathItem) => count + Object.keys(pathItem).length, 0);
    }

    #escapeHtml(text)
    {
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

module.exports = DocsGenerator;
