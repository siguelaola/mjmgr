import axios, { Axios } from "axios";
import Conf from "conf";
import { env } from "process";
import { BaseBackend } from ".";
import { EmailInfo } from "../types";

class SendgridBackend extends BaseBackend {
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

	public createNewTemplate = async (templateName: string) => {
		const response = await this.client.request({
			method: "POST",
			url: "/v3/templates",
			data: { generation: "dynamic", name: templateName },
		});

		const id = response.data["id"];

		if (!id) {
			throw new Error(
				`Did not receive an ID creating sendgrid template ${templateName}`
			);
		}

		return id as string;
	};

	public createNewTemplateVersion = async (
		templateId: string,
		versionName: string,
		htmlBody: string,
		subject: string
	) => {
		const response = await this.client.request({
			method: "POST",
			url: `/v3/templates/${templateId}/versions`,
			data: {
				editor: "code",
				generate_plain_content: true,
				html_content: htmlBody,
				name: versionName,
				plain_content: "",
				template_id: templateId,
				subject: subject,
			},
		});

		const id = response.data["id"];

		if (!id) {
			throw new Error(
				`Did not receive an ID creating sendgrid template version ${versionName} for ${templateId}`
			);
		}

		return id as string;
	};

	public activateVersion = async (templateId: string, versionId: string) => {
		const response = await this.client.request({
			method: "POST",
			url: `/v3/templates/${templateId}/versions/${versionId}/activate`,
		});
		console.log(
			`Sendgrid: Activated version ${versionId} for template ${templateId}`
		);

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

	public write = async ({ name, displayName, html, title, digest }: EmailInfo) => {
		const statePath = `${this.name}.${name}`;
		const templateId = this.state.get(`${statePath}.id`) as string;
		if (templateId) {
			// Template already exists. Check for versions.
			const existingDigest = this.state.get(`${statePath}.sha256`);
			let versionId = this.state.get(`${statePath}.version`) as string;
			if (versionId && digest === existingDigest) {
				// A version already exists, and the last digest is unchanged.
				console.log(
					`Sendgrid: Template ${displayName} (${templateId}) is unchanged.`
				);
			} else {
				// Update the template on sendgrid
				versionId = await this.createNewTemplateVersion(
					templateId,
					digest,
					html,
					title
				);
				this.state.set(`${statePath}.version`, versionId);
				this.state.set(`${statePath}.sha256`, digest);
				console.log(
					`Sendgrid: New version (${versionId}) for template ${displayName} (${templateId})`
				);
				await this.activateVersion(templateId, versionId);
			}
		} else {
			const templateId = await this.createNewTemplate(displayName);
			this.state.set(`${statePath}.id`, templateId);
			console.log(`Sendgrid: Created template ${displayName} (${templateId})`);

			const versionId = await this.createNewTemplateVersion(
				templateId,
				digest,
				html,
				title
			);
			this.state.set(`${statePath}.version`, versionId);
			this.state.set(`${statePath}.sha256`, digest);
			console.log(
				`Sendgrid: New version (${versionId}) for template ${displayName} (${templateId})`
			);
			await this.activateVersion(templateId, versionId);
		}
	};
}

export default SendgridBackend;
