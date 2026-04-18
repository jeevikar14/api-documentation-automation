const http = require("http");
const https = require("https");
const
{ URL } = require("url");

function postJson(urlString, jsonObj, headers = {})
{
    return new Promise((resolve, reject) =>
    {
        const url = new URL(urlString);
        const body = Buffer.from(JSON.stringify(jsonObj), "utf8");

        const requestOptions = {
            hostname: url.hostname,
            port: url.port || (url.protocol === "https:" ? 443 : 80),
            path: url.pathname + (url.search || ""),
            method: "POST",
            headers: Object.assign( {
                "Content-Type": "application/json",
                "Content-Length": body.length
            }, headers)
        };

        const client = url.protocol === "https:" ? https : http;

        const req = client.request(requestOptions, (res) =>
        {
            const chunks = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("end", () =>
            {
                const respBody = Buffer.concat(chunks).toString("utf8");
                resolve( { statusCode: res.statusCode, body: respBody, headers: res.headers });
            });
        });

        req.on("error", (err) => reject(err));
        req.write(body);
        req.end();
    });
}

module.exports = { postJson };
