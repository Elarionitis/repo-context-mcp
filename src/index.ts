import { z } from "zod";

import { McpServer }
from "@modelcontextprotocol/sdk/server/mcp.js";

import { StdioServerTransport }
from "@modelcontextprotocol/sdk/server/stdio.js";

/*
-----------------------------------
Create MCP Server
-----------------------------------
*/
const server = new McpServer({
    name: "repo-context-mcp",
    version: "1.0.0"
});

/*
-----------------------------------
Register MCP Tool
-----------------------------------
*/
server.registerTool(
    "analyze_github_repo",

    {
        title: "Analyze GitHub Repository",

        description:
        "Fetch GitHub repository info and generate project context",

        inputSchema: {
            owner: z.string(),
            repo: z.string()
        }
    },

    /*
    -----------------------------------
    Tool Logic
    -----------------------------------
    */
    async ({ owner, repo }) => {

        console.error(
            "MCP TOOL EXECUTED:",
            owner,
            repo
        );
        /*
        -----------------------------------
        Fetch repository metadata
        -----------------------------------
        */
        const repoResponse =
        await fetch(
            `https://api.github.com/repos/${owner}/${repo}`
        );

        const repoData =
        await repoResponse.json();

        /*
        -----------------------------------
        Fetch README
        -----------------------------------
        */
        let readmePreview =
        "README not found";

        try {

            const readmeResponse =
            await fetch(
                `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/README.md`
            );

            const readmeText =
            await readmeResponse.text();

            readmePreview =
            readmeText
            .slice(0, 2000);

        } catch {

            readmePreview =
            "Could not fetch README";
        }

        /*
        -----------------------------------
        Detect stack
        -----------------------------------
        */
        const stack: string[] = [];

        /*
        Primary language
        */
        if (repoData.language) {
            stack.push(repoData.language);
        }

        /*
        GitHub topics
        */
        const topics =
        repoData.topics || [];

        if (topics.includes("react")) {
            stack.push("React");
        }

        if (topics.includes("nextjs")) {
            stack.push("Next.js");
        }

        if (topics.includes("nodejs")) {
            stack.push("Node.js");
        }

        if (topics.includes("typescript")) {
            stack.push("TypeScript");
        }

        /*
        -----------------------------------
        Final Summary
        -----------------------------------
        */
        const summary = `
Repository Context

Project:
${repoData.full_name}

Description:
${repoData.description}

Primary Language:
${repoData.language}

Stars:
${repoData.stargazers_count}

Detected Stack:
${stack.map(
    x => `- ${x}`
).join("\n")}

README Preview:
${readmePreview}
`;

        /*
        Return result to LLM
        */
        return {
            content: [
                {
                    type: "text",
                    text: summary
                }
            ]
        };
    }
);

/*
-----------------------------------
Start MCP Server
-----------------------------------
*/
const transport =
new StdioServerTransport();

await server.connect(
    transport
);

console.error(
    "GitHub Repo Context MCP running"
);