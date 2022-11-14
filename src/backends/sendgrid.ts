import axios, { Axios } from "axios";
import Conf from "conf";
import { env } from "process";
import { RemoteBackend } from ".";
import { EmailInfo } from "../types";

class SendgridBackend extends RemoteBackend {
	name = "sendgrid";
	apiKey: string;
	client: Axios;

	constructor(config: Conf) {
		super(config);
		const apiKey = env.SENDGRID_API_KEY;
		if (!apiKey) {
			throw new Error("Environment variable SENDGRID_API_KEY needs to be set");
		} else if (!apiKey.startsWith("SG.")) {
			throw new Error("SENDGRID_API_KEY must start with the prefix 'SG.'");
		} else {
			this.apiKey = apiKey;
		}
		this.client = new Axios({
			...axios.defaults,
			baseURL: "https://api.sendgrid.com/",
			headers: { accept: "application/json", authorization: `Bearer ${apiKey}` },
		});
	}

	public createNewTemplate = async (email: EmailInfo): Promise<[string, string]> => {
		const response = await this.client.request({
			method: "POST",
			url: "/v3/templates",
			data: { generation: "dynamic", name: email.name },
		});

		const templateId: string = response.data["id"];
		if (!templateId) {
			throw new Error(
				`Did not receive an ID creating sendgrid template ${email.name}`
			);
		}

		const [versionId] = await this.createNewTemplateVersion(templateId, email);

		return [templateId, versionId];
	};

	public createNewTemplateVersion = async (
		template: string,
		email: EmailInfo
	): Promise<[string]> => {
		const response = await this.client.request({
			method: "POST",
			url: `/v3/templates/${template}/versions`,
			data: {
				editor: "code",
				generate_plain_content: true,
				html_content: email.html,
				name: email.digest,
				plain_content: "",
				template_id: template,
				subject: email.title,
			},
		});

		const versionId: string = response.data["id"];
		if (!versionId) {
			throw new Error(
				`Did not receive an ID creating sendgrid template version ${email.digest} for ${template}`
			);
		}

		await this.activateVersion(template, versionId);

		return [versionId];
	};

	public activateVersion = async (templateId: string, versionId: string) => {
		const response = await this.client.request({
			method: "POST",
			url: `/v3/templates/${templateId}/versions/${versionId}/activate`,
		});

		return response;
	};

	public uploadImage = async (filename: string, imageData: Blob) => {
		const data = new FormData();
		data.append("upload", imageData, filename);
		const response = await this.client.request({
			method: "POST",
			url: "/v3/images",
			headers: {
				"content-type": "multipart/form-data",
			},
			data,
		});

		const { id, url } = response.data;

		if (!id || !url) {
			throw new Error(
				`Did not receive an ID or URL when uploading image ${filename}`
			);
		}

		return { id, url };
	};
}

export default SendgridBackend;
