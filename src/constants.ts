const config = require("../config.json");

export const mime: Record<string, string> = {
	html: "text/html",
	txt: "text/plain",
	css: "text/css",
	// gif: "image/gif",
	jpg: "image/jpeg",
	png: "image/png",
	webp: "image/webp",
	// svg: "image/svg+xml",
	js: "application/javascript",
};

export const picture_folder = config.pictureFolder;
export const cached_folder = config.cachedFolder;
export const max_upload_size = 1024 * 1024 * config.maxUpload;
export const cached_size = config.cacheSize;
export const compression = config.compression;
