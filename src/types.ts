import type Conf from "conf";

export interface EmailInfo {
	name: string;
	baseName: string;
	title: string;
	html: string;
	digest: string;
}

export interface Backend {
	constructor: (conf: Conf) => void;
	write: (info: EmailInfo) => Promise<void>;
}
