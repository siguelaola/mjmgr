import axios, { Axios } from "axios";
import Conf from "conf";
import { createHash } from "crypto";
import FormData from "form-data";
import { env } from "process";
import { EmailInfo } from "../types";

class MailgunBackend {
	name = "mailgun";
	apiKey: string;
	domain: string;
	state: Conf;
	client: Axios;

	constructor(config: Conf) {
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
		this.state = new Conf({
			projectName: "mjmgr",
			configName: "mjmgr_state",
		});
		// @ts-ignore
		this.client = new Axios({
			...axios.defaults,
			baseURL: `https://api.mailgun.net/v3/${this.domain}`,
			auth: { username: "api", password: this.apiKey },
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
		const response = await this.client.request({
			method: "POST",
			url: "/templates",
			data: fd,
		});

		return response;
	};

	public write = async ({ name, html }: EmailInfo) => {
		const digest = createHash("sha256").update(html).digest("hex");

		const templateResponse = await this.createNewTemplate(name, digest, html, "");
		console.log(`Mailgun: Created template ${name}`);
		console.log(templateResponse.data);
	};
}

export default MailgunBackend;
