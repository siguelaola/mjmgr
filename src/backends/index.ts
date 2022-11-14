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
