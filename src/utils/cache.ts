// NOTE: If user deletes a photo, we need to remove it from the cache
// this is not possible with the current implementation
// these cached photos will be deleted automatically because they are not used
import fs, { promises as fsAsync } from "fs";
import cron from "node-cron";

interface GetCB {
	(err: Error, value: string): void;
}

interface SetCB {
	(err: Error, expired?: { key: string; value: string }): void;
}

class Cache {
	private version: string = "0.1.0";
	private max: number;
	private node: Map<string, string>;

	constructor(max: number = 10000) {
		this.node = new Map();
		if (this.load() == false) {
			this.max = max;
		}
		// cron.schedule("0 * * * *", () => {
		// 	this.save();
		// });
	}
	get(key: string, callback: GetCB = () => {}): string | undefined {
		const value = this.node.get(key);
		if (value != undefined) {
			// no way to overflow  with this set()
			this.node.delete(key);
			this.node.set(key, value);
		}
		callback(null, value);
		return value;
	}
	set(key: string, value: string, callback: SetCB = () => {}): void {
		if (this.node.has(key)) {
			this.node.delete(key);
		} else if (this.node.size > this.max) {
			const firstKey = this.first();
			callback(null, { key: firstKey, value: this.node.get(firstKey) });
			this.node.delete(firstKey);
		}
		this.node.set(key, value);
	}
	private first() {
		return this.node.keys().next().value;
	}

	private mapToObject(input: Map<string, string>): Record<string, string> {
		const output: Record<string, string> = {};
		for (let [key, value] of input) {
			output[key] = value;
		}
		return output;
	}

	async save(): Promise<void> {
		const data = JSON.stringify({
			max: this.max,
			node: this.mapToObject(this.node),
			version: this.version,
		});
		fsAsync.writeFile("cache/cache.json", data, "utf8").catch((err) => {
			console.log(err);
		});
	}

	load(): boolean {
		try {
			const _data = fs.readFileSync("cache/cache.json").toString();
			const data = JSON.parse(_data);
			if (data.version !== this.version) {
				throw new Error("Cache version mismatch");
				return false;
			} else {
				// TODO: check if data is valid
				this.max = data.max;
				let counter = 0;
				for (var key in data.node) {
					this.node.set(key, data.node[key]);
					counter++;
					if (counter > data.max) {
						break;
					}
				}
				return true;
			}
			return false;
		} catch (err) {
			return false;
		}
	}
}

export default Cache;

//TODO: write cache to disk on exit and periodicly
