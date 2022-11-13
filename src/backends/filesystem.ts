import Conf from "conf";
import { mkdirSync } from "fs";
import { writeFile } from "fs/promises";
import { join } from "path";
import { EmailInfo } from "../types";

class FilesystemBackend {
	basePath: string;

	constructor(config: Conf) {
		this.basePath = config.get("output_dir", "./out/") as string;

		try {
			mkdirSync(this.basePath);
		} catch (err) {
			//@ts-ignore
			if (err.code !== "EEXIST") {
				throw err;
			}
		}
	}

	public write = async ({ name, html }: EmailInfo) => {
		const path = join(this.basePath, `${name}.html`);
		await writeFile(path, html);
		console.log(`Generated ${path}`);
	};
}

export default FilesystemBackend;
