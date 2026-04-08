/**
 * pi extension entry point for pi-desktop-notify.
 *
 * When installed as a pi package, this automatically:
 * - Starts terminal focus tracking (DECSET 1004)
 * - Captures the compositor window ID for click-to-focus
 * - Sends a desktop notification when the agent goes idle
 * - Cleans up focus tracking on session shutdown
 * - Registers /project-name command for custom project names in notifications
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { startFocusTracking, stopFocusTracking } from "./focus.js";
import { sendNotification } from "./notify.js";
import { getProjectName, removeProjectName, setProjectName } from "./project.js";
import { captureWindowId } from "./window.js";

export default function (pi: ExtensionAPI) {
	pi.on("session_start", async (_event, _ctx) => {
		startFocusTracking();
		await captureWindowId();
	});

	pi.on("session_shutdown", async (_event, _ctx) => {
		stopFocusTracking();
	});

	pi.on("agent_end", async (_event, ctx) => {
		const projectName = getProjectName(ctx.cwd);
		await sendNotification({
			title: "✅ Task complete",
			body: "Pi is waiting for input",
			cwd: ctx.cwd,
			projectName,
		});
	});

	pi.registerCommand("project-name", {
		description: "Set project name for notifications",
		handler: async (args, ctx) => {
			const trimmed = args.trim();
			if (!trimmed) {
				const previous = getProjectName(ctx.cwd);
				if (previous) {
					try {
						removeProjectName(ctx.cwd);
						ctx.ui.notify(`Project name ("${previous}") removed`, "info");
					} catch (err) {
						const message = err instanceof Error ? err.message : String(err);
						ctx.ui.notify(`Failed to remove project name: ${message}`, "error");
					}
				} else {
					ctx.ui.notify('Usage: /project-name "My Project"', "error");
				}
				return;
			}
			try {
				setProjectName(ctx.cwd, trimmed);
				ctx.ui.notify(`Project name set to "${trimmed}"`, "info");
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				ctx.ui.notify(`Failed to set project name: ${message}`, "error");
			}
		},
	});
}
