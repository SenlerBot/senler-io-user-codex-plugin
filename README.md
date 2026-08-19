# Senler.io User Codex plugin

Плагин подключает Codex к пользовательскому MCP-серверу Senler.io. Native OAuth предоставляет доступ к проектам и возможностям, доступным авторизованному пользователю Senler.io.

## Установка

Добавьте публичный marketplace:

```bash
codex plugin marketplace add https://github.com/SenlerBot/senler-io-user-codex-plugin.git
```

Установите плагин:

```bash
codex plugin add senler-io-user@senler-io-user
```

После установки откройте новую задачу Codex и вызовите любой защищённый инструмент. MCP-клиент сам запустит OAuth.

## Когда использовать

- чтобы увидеть доступные пользователю проекты;
- чтобы работать с данными и настройками разных проектов;
- чтобы управлять каналами, агентами, диалогами, лидами, приложениями и другими доступными сущностями;
- когда проектный плагин с доступом только к одному выбранному проекту слишком ограничен.

Для изолированного доступа только к одному выбранному проекту используйте отдельный плагин [Senler.io Project](https://github.com/SenlerBot/senler-io-codex-plugin).

Плагин не запрашивает токены в чате и не использует `OPENAI_API_KEY`. Авторизацией управляет MCP-клиент по стандартному OAuth.

## Обновление

```bash
codex plugin marketplace upgrade senler-io-user
codex plugin add senler-io-user@senler-io-user
```

После обновления откройте новую задачу Codex.

## Состав

- `.agents/plugins/marketplace.json` — публичный каталог;
- `plugins/senler-io-user/.codex-plugin/plugin.json` — manifest плагина;
- `plugins/senler-io-user/.mcp.json` — подключение к hosted MCP server;
- `plugins/senler-io-user/skills/senler-io-user/SKILL.md` — правила безопасной работы с Senler.io.
