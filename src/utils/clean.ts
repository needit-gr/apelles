/*****NOT USED*****/

import fs from "fs";
import path from "path";
import cached_folder from "../constants";

setInterval(function () {
	walkDir(cached_folder, function (filePath) {
		fs.stat(filePath, function (err, stat) {
			var now = new Date().getTime();
			var endTime = new Date(stat.mtime).getTime() + 86400000; // 1 days in miliseconds

			if (err) {
				return console.error(err);
			}

			if (now > endTime) {
				//console.log('DEL:', filePath);
				return fs.unlink(filePath, function (err) {
					if (err) return console.error(err);
				});
			}
		});
	});
}, 18000000); // every 5 hours

function walkDir(dir, callback) {
	fs.readdirSync(dir).forEach((f) => {
		let dirPath = path.join(dir, f);
		let isDirectory = fs.statSync(dirPath).isDirectory();
		isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
	});
}
