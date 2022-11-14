import { AxiosError, AxiosResponse } from "axios";
import Conf from "conf";
import { EmailInfo } from "../types";

export class BaseBackend {
	state: Conf;
	name: string = "";

	constructor(config: Conf) {
		this.state = new Conf({
			projectName: "mjmgr",
			configName: "mjmgr_state",
		});
	}

	public write = async (email: EmailInfo): Promise<void> => {};
}

export class RemoteBackend extends BaseBackend {
	public createNewTemplate = async (email: EmailInfo): Promise<[string, string]> => {
		return ["", ""];
	};

	public createNewTemplateVersion = async (
		template: string,
		email: EmailInfo
	): Promise<[string]> => {
		return [""];
	};

	private handleError = async (e: AxiosError | unknown) => {
		const ae = e as AxiosError;
		if (ae.response) {
			console.error(
				`${this.name}: API error (${
					ae.code
				}): ${await this.errorResponseToString(ae.response)}`
			);
		} else if (ae.request) {
			console.error(`${this.name}: Network error (${ae.code}): ${ae.cause}`);
		} else {
			throw e;
		}
	};

	public errorResponseToString = async (response: AxiosResponse) => {
		return JSON.stringify(response.data);
	};

	public write = async (email: EmailInfo) => {
		const statePath = `${this.name}.${email.name}`;
		const templateId = this.state.get(`${statePath}.id`) as string;
		if (templateId) {
			// Template already exists. Check for versions.
			const existingDigest = this.state.get(`${statePath}.sha256`);
			if (
				this.state.get(`${statePath}.version`) &&
				email.digest === existingDigest
			) {
				// A version already exists, and the last digest is unchanged.
				console.log(`Mailgun: Template ${email.name} is unchanged.`);
			} else {
				// Update the template contents
				try {
					const [versionId] = await this.createNewTemplateVersion(
						templateId,
						email
					);
					this.state.set(`${statePath}.version`, versionId);
					this.state.set(`${statePath}.sha256`, email.digest);
					console.log(
						`${this.name}: New version (${versionId}) for template ${email.displayName} (${templateId})`
					);
				} catch (e) {
					this.handleError(e);
				}
			}
		} else {
			try {
				const [templateId, versionId] = await this.createNewTemplate(email);
				this.state.set(`${statePath}.id`, templateId);
				console.log(
					`${this.name}: Created initial version of template ${email.name} (${templateId})`
				);
				this.state.set(`${statePath}.version`, versionId);
				this.state.set(`${statePath}.sha256`, email.digest);
			} catch (e) {
				this.handleError(e);
			}
		}
	};
}
