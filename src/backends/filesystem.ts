import Conf from "conf";
import { mkdirSync } from "fs";
import { writeFile } from "fs/promises";
import { join } from "path";

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

	public write = async (templateName: string, htmlBody: string) => {
		const path = join(this.basePath, `${templateName}.html`);
		await writeFile(path, htmlBody);
		console.log(`Generated ${path}`);
	};
}

export default FilesystemBackend;
