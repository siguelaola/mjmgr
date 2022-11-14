import axios, { Axios } from "axios";
import Conf from "conf";
import FormData from "form-data";
import { env } from "process";
import { BaseBackend } from ".";
import { EmailInfo, MailgunTemplateResponse } from "../types";

class MailgunBackend extends BaseBackend {
	name = "mailgun";
	apiKey: string;
	domain: string;
	client: Axios;

	constructor(config: Conf) {
		super(config);
		if (env.MAILGUN_API_KEY) {
			this.apiKey = env.MAILGUN_API_KEY;
		} else {
			throw new Error("Environment variable MAILGUN_API_KEY needs to be set");
		}
		if (env.MAILGUN_DOMAIN) {
			this.domain = env.MAILGUN_DOMAIN;
		} else {
			throw new Error("Environment variable MAILGUN_DOMAIN needs to be set");
		}
		this.client = new Axios({
			...axios.defaults,
			baseURL: `https://api.mailgun.net/v3/${this.domain}`,
			auth: { username: "api", password: this.apiKey },
			headers: {},
		});
	}

	public createNewTemplate = async (
		name: string,
		description: string,
		body: string,
		comment: string
	) => {
		const fd = new FormData();
		fd.append("name", name);
		fd.append("description", description);
		fd.append("template", body);
		fd.append("engine", "handlebars");
		fd.append("comment", comment);
		const response = await this.client.request<MailgunTemplateResponse>({
			method: "POST",
			url: "/templates",
			data: fd,
		});

		return response;
	};

	public createNewTemplateVersion = async (
		templateName: string,
		tag: string,
		template: string
	) => {
		const fd = new FormData();
		fd.append("tag", tag.slice(0, 50));
		fd.append("template", template);
		fd.append("engine", "handlebars");
		const response = await this.client.request<MailgunTemplateResponse>({
			method: "POST",
			url: `/templates/${templateName}/versions`,
			data: fd,
		});

		return response;
	};

	public write = async ({ displayName, name, html, digest }: EmailInfo) => {
		const statePath = `${this.name}.${name}`;
		const templateId = this.state.get(`${statePath}.id`) as string;
		if (templateId) {
			// Template already exists. Check for versions.
			const existingDigest = this.state.get(`${statePath}.sha256`);
			let versionId = this.state.get(`${statePath}.version`) as string;
			if (versionId && digest === existingDigest) {
				// A version already exists, and the last digest is unchanged.
				console.log(`Mailgun: Template ${name} is unchanged.`);
			} else {
				// Update the template contents
				const response = await this.createNewTemplateVersion(
					name,
					digest,
					html
				);
				versionId = response.data.template.version.id;
				this.state.set(`${statePath}.version`, versionId);
				this.state.set(`${statePath}.sha256`, digest);
				console.log(
					`Sendgrid: New version (${versionId}) for template ${displayName} (${templateId})`
				);
			}
		} else {
			const templateResponse = await this.createNewTemplate(
				name,
				digest,
				html,
				""
			);
			const templateId = templateResponse.data.template.id;
			this.state.set(`${statePath}.id`, templateId);
			console.log(
				`Mailgun: Created initial version of template ${name} (${templateId})`
			);
			this.state.set(
				`${statePath}.version`,
				templateResponse.data.template.version.id
			);
			this.state.set(`${statePath}.sha256`, digest);
		}
	};
}

export default MailgunBackend;
