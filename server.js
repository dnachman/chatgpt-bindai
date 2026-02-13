import { createServer } from "node:http";
import { readFileSync, watch } from "node:fs";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const getQuoteInputSchema = {
  business_name: z.string().describe("Name of the business"),
  business_owner: z.string().describe("Name of the business owner"),
  business_address: z.string().describe("Address of the business"),
  business_industry: z.string().describe("Industry of the business"),
  number_of_employees: z.number().describe("Number of employees"),
  total_payroll: z.number().describe("Total annual payroll"),
  state: z.string().describe("State code (e.g. CA, NY)"),
  zip_code: z.string().describe("Zip code"),
  email_address: z.string().email().describe("Email address"),
};

// Track active servers to send notifications
const activeServers = new Set();

// Watch for file changes
watch("public/quote-widget.html", (eventType, filename) => {
  if (filename) {
    console.log(`File ${filename} changed`);
    for (const server of activeServers) {
      server.server.sendResourceUpdated({ uri: "ui://widget/quote.html" });
    }
  }
});

function createQuoteServer() {
  const server = new McpServer({ name: "quote-app", version: "0.1.0" });

  registerAppResource(
    server,
    "quote-widget",
    "ui://widget/quote.html",
    {},
    async () => ({
      contents: [
        {
          uri: "ui://widget/quote.html",
          mimeType: RESOURCE_MIME_TYPE,
          text: readFileSync("public/quote-widget.html", "utf8"),
        },
      ],
    })
  );

  registerAppTool(
    server,
    "get_quote",
    {
      title: "Get Insurance Quote",
      description: "Get workers compensation insurance quotes based on business details",
      inputSchema: getQuoteInputSchema,
      _meta: {
        ui: { resourceUri: "ui://widget/quote.html" },
      },
    },
    async (args) => {
        // Log the received arguments
        console.log("------------------------------------------");
        console.log("Received Quote Request:");
        console.log("Business Name:", args.business_name);
        console.log("Owner:", args.business_owner);
        console.log("Payroll:", args.total_payroll);
        console.log("Employees:", args.number_of_employees);
        console.log("------------------------------------------");

        // Generate simplified fake quotes based on inputs
        const basePremium = (args.total_payroll * 0.02) + (args.number_of_employees * 50);
        
        const quotes = [
            {
                company: "SafeGuard Insurance",
                premium: Math.round(basePremium * 0.9),
                deductible: 1000
            },
            {
                company: "BizProtect Corp",
                premium: Math.round(basePremium * 1.1),
                deductible: 500
            },
            {
                company: "WorkerShield",
                premium: Math.round(basePremium * 1.05),
                deductible: 750
            }
        ];

      return {
        // content: [{ type: "text", text: `Generated 3 quotes for ${args.business_name}` }],
        structuredContent: { quotes: quotes },
      };
    }
  );

  return server;
}

const port = Number(process.env.PORT ?? 8787);
const host = process.env.MCP_HOST || 'localhost';
const MCP_PATH = "/mcp";

const httpServer = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400).end("Missing URL");
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "OPTIONS" && url.pathname === MCP_PATH) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, mcp-session-id",
      "Access-Control-Expose-Headers": "Mcp-Session-Id",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "content-type": "text/plain" }).end("Insurance Quote MCP server");
    return;
  }

  const MCP_METHODS = new Set(["POST", "GET", "DELETE"]);
  if (url.pathname === MCP_PATH && req.method && MCP_METHODS.has(req.method)) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

    const server = createQuoteServer();
    activeServers.add(server); // Track active server

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless mode
      enableJsonResponse: true,
    });

    res.on("close", () => {
        activeServers.delete(server); // Cleanup
        transport.close();
        server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("Error handling MCP request:", error);
      if (!res.headersSent) {
        res.writeHead(500).end("Internal server error");
      }
    }
    return;
  }

  res.writeHead(404).end("Not Found");
});

httpServer.listen(port, host, () => {
  console.log(
    `Quote MCP server listening on http://${host}:${port}${MCP_PATH}`
  );
});