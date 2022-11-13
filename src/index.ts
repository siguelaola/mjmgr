#!/usr/bin/env node

import { render } from "@faire/mjml-react";
import Conf from "conf";
import { readdir, readFile } from "fs/promises";
import i18next from "i18next";
import { parse } from "node-html-parser";
import { join, parse as parsePath, resolve } from "path";
import FilesystemBackend from "./backends/filesystem";
import MailgunBackend from "./backends/mailgun";
import SendgridBackend from "./backends/sendgrid";

type ValidationLevel = "strict" | "soft" | "skip";

const BACKENDS = {
	fs: FilesystemBackend,
	sendgrid: SendgridBackend,
	mailgun: MailgunBackend,
};

const extractTitle = (html: string) =>
	parse(html).querySelector("title")?.textContent || "";

export default (async () => {
	const config = new Conf({
		cwd: ".",
		projectName: "mjmgr",
		configName: "mjmgr",
	});

	const supportedLanguages = config.get("supported_languages", ["en"]) as string[];
	const validationLevel = config.get("validation_level", "strict") as ValidationLevel;

	const i18nPath = config.get("i18n.path", "./src/i18n.json") as string;
	const emailsDir = config.get("emails_dir", "./src/emails/") as string;

	const resources = JSON.parse((await readFile(resolve(i18nPath))).toString());
	const enabledBackends = config.get("backends", ["fs"]) as string[];
	const backends = enabledBackends.map((backend) => {
		if (backend in BACKENDS) {
			// @ts-ignore
			return new BACKENDS[backend](config);
		} else {
			throw new Error(`Unknown backend in configuration: ${backend}`);
		}
	});
	const i18nConfig = config.get("i18n.config", {}) as Object;

	i18next.init({ resources, ...i18nConfig });

	const files = await readdir(emailsDir);

	for (const locale of supportedLanguages) {
		const t = await i18next.changeLanguage(locale);

		for (const file of files) {
			const modulePath = resolve(join(emailsDir, file));
			const imp = await import(modulePath);
			const component = imp.default.default;

			if (!component) {
				console.error(`Invalid export in ${modulePath}: ${component}`);
				continue;
			}

			const { html } = render(component({ locale, t }), {
				validationLevel,
			});

			const title = extractTitle(html).trim();

			const templateBaseName = parsePath(file).name;
			const templateName = `${templateBaseName}_${locale}`;

			backends.forEach(async (backend) => {
				await backend.write(templateName, html, title);
			});
		}
	}
})();
