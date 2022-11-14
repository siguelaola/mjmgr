export interface EmailInfo {
	name: string;
	displayName: string;
	baseName: string;
	title: string;
	html: string;
	digest: string;
}

export interface MailgunTemplate {
	name: string;
	description: string;
	createdAt: string;
	createdBy: string;
	id: string;
	version: MailgunTemplateVersion;
}

export interface MailgunTemplateVersion {
	tag: string;
	template: string;
	engine: string;
	mjml: string;
	createdAt: string;
	id: string;
	comment: string;
	active: boolean;
}

export interface MailgunTemplateResponse {
	message: string;
	template: MailgunTemplate;
}
