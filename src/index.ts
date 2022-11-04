#!/usr/bin/env node

import { render } from "@faire/mjml-react";
import { readdir, readFile } from "fs/promises";
import i18next from "i18next";
import path from "path";
import FilesystemBackend from "./backends/filesystem";
import SendgridBackend from "./backends/sendgrid";

const EMAILS_DIR = "build/emails/";
const OUT_DIR = "out/";
const DEFAULT_LOCALE = "en";
const I18N_RESOURCES = path.resolve("src/i18n.json");
const SUPPORTED_LANGUAGES = ["en", "es"];
const VALIDATION_LEVEL = "strict";

export default (async () => {
	const resources = JSON.parse((await readFile(I18N_RESOURCES)).toString());

	i18next.init({
		resources: resources,
		defaultNS: "common",
		lng: DEFAULT_LOCALE,
	});

	const files = await readdir(EMAILS_DIR);
	const backends = [new FilesystemBackend(OUT_DIR), new SendgridBackend()];

	for (const locale of SUPPORTED_LANGUAGES) {
		const t = await i18next.changeLanguage(locale);

		for (const file of files) {
			const modulePath = path.resolve(path.join(EMAILS_DIR, file));
			const component = (await import(modulePath)).default;

			const { html } = render(component({ locale, t }), {
				validationLevel: VALIDATION_LEVEL,
			});

			const templateBaseName = path.parse(file).name;
			const templateName = `${templateBaseName}_${locale}`;

			backends.forEach(async (backend) => {
				await backend.write(templateName, html);
			});
		}
	}
})();
