import type Conf from "conf";

export interface EmailInfo {
	name: string;
	displayName: string;
	baseName: string;
	title: string;
	html: string;
	digest: string;
}

export interface Backend {
	constructor: (conf: Conf) => void;
	write: (info: EmailInfo) => Promise<void>;
}

export interface MailgunTemplate {
	name: string;
	description: string;
	createdAt: string;
	createdBy: string;
	id: string;
}

export interface MailgunTemplateResponse {
	message: string;
	template: MailgunTemplate;
}
