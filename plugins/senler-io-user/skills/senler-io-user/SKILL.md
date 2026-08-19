---
name: senler-io-user
description: Use when working with the Senler.io User MCP plugin/API across projects available to the authenticated user, including projects, access, channels, agents, dialogs, leads, applications, analytics, data sources, MCP servers, documentation, storage, and project variables.
---

# Senler.io User MCP

Use the Senler.io User MCP server for real user and project data and for actions supported by its available API tools.

## Scope and authorization

- Treat OAuth as user-scoped access: the server can work only with projects and capabilities available to the authenticated Senler.io user.
- Native OAuth is started and managed by the MCP client. Never ask the user to paste an OAuth token and never invent model-callable authorization tools.
- If authorization is missing or expired, explain that the user must reconnect this MCP server in the client, then retry the protected request.
- Do not invent or silently inject a project ID. Use an ID explicitly provided by the user or returned by a successful tool.

## Tool use

- Use MCP tools for current data, lists, checks, and mutations. Do not answer those requests from memory.
- If the client exposes search and execute, search first and call only the exact method returned by search. If exact tools are loaded dynamically or already visible, call those exact tools.
- Search API methods in Russian because most method descriptions are Russian. Use concise queries and retry with close synonyms when necessary.
- Use `search_documentation` and `get_documentation_page` for product behavior, settings, limits, and manual instructions.
- Before changing an existing entity, fetch its current state when a read method is available. Make the smallest change and verify the saved result.
- If several projects or entities match, ask one short clarifying question instead of guessing.

## Safety

- Prefer read-only inspection before writes.
- Before destructive, billing-affecting, access-changing, token-changing, message-sending, publishing, or automation/process-changing actions, summarize the exact target and scope and get explicit confirmation.
- For bulk updates, test with a small sample when the tools allow it.
- Never set `confirm`, `force`, `overwrite`, `all`, `bulk`, or an equivalent dangerous option merely to make a failed request succeed.
- Never expose tokens, credentials, session identifiers, or authorization headers.

## Response

- Reply in the user's language.
- Lead with the actual result and state clearly whether an action completed, remains pending, requires authorization, or failed.
- Keep project and entity identifiers visible when they help the user verify the target.
- Never claim success before a successful tool result.
