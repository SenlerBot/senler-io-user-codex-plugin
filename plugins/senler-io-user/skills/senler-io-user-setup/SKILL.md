---
name: senler-io-user-setup
description: Set up or troubleshoot the Senler.io User Codex plugin, its OAuth connection, and project selection. Use for first connection, missing tools, sign-in errors, or reconnecting this plugin.
---

# Connect Senler.io User

Establish a working connection and the user's intended project through read-only checks. Setup does not authorize edits, messages, publication, or activation.

1. Check whether this plugin's MCP tools are available. When local CLI access is available, `codex plugin list --marketplace senler-user --available --json` distinguishes an available catalog entry from an installed plugin. Otherwise use the client's Plugins settings. Do not treat a configured marketplace as proof of installation.
2. If installation is needed, use the documented marketplace and plugin identifiers:

   ```sh
   codex plugin marketplace add https://github.com/SenlerBot/senler-io-user-codex-plugin.git
   codex plugin add senler-io-user@senler-user
   ```

   Run these only within the user's requested setup scope. Refresh the client or open a new chat if the newly installed tools are not available yet.
3. Discover the read-only method for listing projects with `search`, or reuse its already available exact schema. Call it with a small supported limit to check the connection. Let the MCP client handle OAuth; if it requests sign-in, direct the user to the client's connection flow. Never ask for a token or fabricate an authorization URL.
4. Use the project already specified for this task. Otherwise present the returned choices and clarify the intended project when needed. An empty list can mean that this account has no accessible projects; it does not by itself prove an OAuth failure. Do not report that a list is complete when it is paginated.
5. Confirm only what was verified: tools loaded, authenticated read succeeded, and the target project was established. Listing projects does not prove write permissions or access to every object.

For failures, distinguish installation, server/network availability, authentication, method availability, and project access. Use `diagnose_access` for missing methods when available. Reconnection with new consent may resolve missing OAuth scopes; ordinary token refresh does not add scopes. A project membership error requires checking the account and target project. Report server or network errors as such, with no repeated sign-in loop.

Once connected, follow the bundled `senler-io-user` skill for the requested work.
