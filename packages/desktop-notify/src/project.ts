/**
 * Per-project name configuration.
 *
 * Stores project names keyed by project path in a global config file:
 * ~/.pi/agent/extensions/pi-desktop-notify.json
 *
 * Format: { "/path/to/project": "Project Name" }
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

function globalConfigPath(): string {
	const home = process.env.HOME;
	if (!home) {
		throw new Error("pi-desktop-notify: HOME environment variable is not set");
	}
	return join(home, ".pi", "agent", "extensions", "pi-desktop-notify.json");
}

function loadConfig(): Record<string, string> {
	const path = globalConfigPath();
	if (!existsSync(path)) {
		return {};
	}

	try {
		const raw = JSON.parse(readFileSync(path, "utf-8"));
		// Validate it's a record of strings
		if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
			throw new Error("config must be a JSON object");
		}
		for (const [key, value] of Object.entries(raw)) {
			if (typeof value !== "string") {
				throw new Error(`value for "${key}" must be a string`);
			}
		}
		return raw as Record<string, string>;
	} catch (err) {
		throw new Error(`pi-desktop-notify: failed to load config at ${path}: ${err instanceof Error ? err.message : err}`);
	}
}

function saveConfig(config: Record<string, string>): void {
	const path = globalConfigPath();
	try {
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, JSON.stringify(config, null, 2), "utf-8");
	} catch (err) {
		throw new Error(`pi-desktop-notify: failed to save config to ${path}: ${err instanceof Error ? err.message : err}`);
	}
}

function trimQuotes(value: string): string {
	const quotePairs = [
		['"', '"'],
		["'", "'"],
		['"""', '"""'],
		["'''", "'''"],
	] as const;

	for (const [open, close] of quotePairs) {
		if (value.startsWith(open) && value.endsWith(close)) {
			return value.slice(open.length, -close.length).trim();
		}
	}
	return value;
}

/**
 * Set the project name for a given path.
 * Strips surrounding quotes from the name (", ', """, ''').
 */
export function setProjectName(projectPath: string, name: string): void {
	const resolvedPath = resolve(projectPath.trim());
	const unquotedName = trimQuotes(name.trim());

	if (unquotedName.length < 1) {
		throw new Error("pi-desktop-notify: project name cannot be empty");
	}

	const config = loadConfig();
	config[resolvedPath] = unquotedName;
	saveConfig(config);
}

/**
 * Get the project name for a given path.
 * Returns undefined if no name is set for this path.
 */
export function getProjectName(projectPath: string): string | undefined {
	const resolvedPath = resolve(projectPath.trim());
	const config = loadConfig();
	const name = config[resolvedPath] ?? undefined;
	return name;
}

/**
 * Remove the project name for a given path.
 */
export function removeProjectName(projectPath: string): void {
	const resolvedPath = resolve(projectPath.trim());
	const config = loadConfig();
	delete config[resolvedPath];
	saveConfig(config);
}
