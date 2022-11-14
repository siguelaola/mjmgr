import axios, { Axios } from "axios";
import Conf from "conf";
import FormData from "form-data";
import { env } from "process";
import { RemoteBackend } from ".";
import { EmailInfo, MailgunTemplateResponse } from "../types";

class MailgunBackend extends RemoteBackend {
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

	public createNewTemplate = async (email: EmailInfo): Promise<[string, string]> => {
		const fd = new FormData();
		fd.append("name", email.name);
		fd.append("description", email.displayName);
		fd.append("template", email.html);
		fd.append("engine", "handlebars");
		fd.append("comment", "");
		const response = await this.client.request<MailgunTemplateResponse>({
			method: "POST",
			url: "/templates",
			data: fd,
		});

		return [response.data.template.id, response.data.template.version.id];
	};

	public createNewTemplateVersion = async (
		template: string,
		email: EmailInfo
	): Promise<[string]> => {
		const tag = email.digest.slice(0, 50);

		const fd = new FormData();
		fd.append("tag", tag);
		fd.append("template", email.html);
		fd.append("engine", "handlebars");
		fd.append("active", "true");
		const response = await this.client.request<MailgunTemplateResponse>({
			method: "POST",
			url: `/templates/${email.name}/versions`,
			data: fd,
		});

		return [response.data.template.version.id];
	};
}

export default MailgunBackend;
