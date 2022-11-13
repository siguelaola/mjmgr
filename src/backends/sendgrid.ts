import client from "@sendgrid/client";
import Conf from "conf";
import { createHash } from "crypto";
import { env } from "process";
import { EmailInfo } from "../types";

class SendgridBackend {
	name = "sendgrid";
	apiKey: string;
	state: Conf;

	constructor(config: Conf) {
		if (env.SENDGRID_API_KEY) {
			this.apiKey = env.SENDGRID_API_KEY;
		} else {
			throw new Error("Environment variable SENDGRID_API_KEY needs to be set");
		}
		this.state = new Conf({
			projectName: "mjmgr",
			configName: "mjmgr_state",
		});
		client.setApiKey(this.apiKey);
	}

	public createNewTemplate = async (templateName: string) => {
		const [response] = await client.request({
			method: "POST",
			url: "/v3/templates",
			body: { generation: "dynamic", name: templateName },
		});

		// @ts-ignore
		const id = response.body["id"];

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
		const [response] = await client.request({
			method: "POST",
			url: `/v3/templates/${templateId}/versions`,
			body: {
				editor: "code",
				generate_plain_content: true,
				html_content: htmlBody,
				name: versionName,
				plain_content: "",
				template_id: templateId,
				subject: subject,
			},
		});

		// @ts-ignore
		const id = response.body["id"];

		if (!id) {
			throw new Error(
				`Did not receive an ID creating sendgrid template version ${versionName} for ${templateId}`
			);
		}

		return id as string;
	};

	public activateVersion = async (templateId: string, versionId: string) => {
		const [response] = await client.request({
			method: "POST",
			url: `/v3/templates/${templateId}/versions/${versionId}/activate`,
		});
		console.log(
			`Sendgrid: Activated version ${versionId} for template ${templateId}`
		);

		return response;
	};

	public uploadImage = async (filename: string, data: Blob) => {
		const body = new FormData();
		body.append("upload", data, filename);
		const [response] = await client.request({
			method: "POST",
			url: "/v3/images",
			headers: {
				"content-type": "multipart/form-data",
			},
			body,
		});

		// @ts-ignore
		const { id, url } = response.body;

		if (!id || !url) {
			throw new Error(
				`Did not receive an ID or URL when uploading image ${filename}`
			);
		}

		return { id, url };
	};

	public write = async ({ name, html, title }: EmailInfo) => {
		const statePath = `${this.name}.${name}`;

		const digest = createHash("sha256").update(html).digest("hex");

		const templateId = this.state.get(`${statePath}.id`) as string;
		if (templateId) {
			// Template already exists. Check for versions.
			const existingDigest = this.state.get(`${statePath}.sha256`);
			let versionId = this.state.get(`${statePath}.version`) as string;
			if (versionId && digest === existingDigest) {
				// A version already exists, and the last digest is unchanged.
				console.log(`Sendgrid: Template ${name} (${templateId}) is unchanged.`);
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
					`Sendgrid: New version (${versionId}) for template ${name} (${templateId})`
				);
				await this.activateVersion(templateId, versionId);
			}
		} else {
			const templateId = await this.createNewTemplate(name);
			this.state.set(`${statePath}.id`, templateId);
			console.log(`Sendgrid: Created template ${name} (${templateId})`);

			const versionId = await this.createNewTemplateVersion(
				templateId,
				digest,
				html,
				title
			);
			this.state.set(`${statePath}.version`, versionId);
			this.state.set(`${statePath}.sha256`, digest);
			console.log(
				`Sendgrid: New version (${versionId}) for template ${name} (${templateId})`
			);
			await this.activateVersion(templateId, versionId);
		}
	};
}

export default SendgridBackend;
