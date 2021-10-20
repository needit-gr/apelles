// https://wardprice.medium.com/image-upload-with-node-js-and-typescript-c9e2ccec874b
// https://gist.github.com/joeydumont/146bf651f00d7469152b6ea311fbf27f
import path from "path";
import fs from "fs";
import { Router, Request, Response } from "express";
import multer from "multer";
import { ResizeOptions } from "sharp";
import { resize, Cache } from "../utils";
import {
	mime,
	picture_folder,
	cached_folder,
	max_upload_size,
	cached_size,
} from "../constants";

const cache = new Cache(cached_size);

interface MulterRequest extends Request {
	file: any;
}

const fileFilter = (req: unknown, file: { mimetype: string }, cb: any) => {
	if (
		file.mimetype === mime.jpg ||
		file.mimetype === mime.png ||
		file.mimetype === mime.webp
	) {
		cb(null, true);
	} else {
		cb(new Error("file type " + file.mimetype + " not supported"), false);
	}
};

const storage = multer.diskStorage({
	destination: function (req: any, file: { originalname: string }, cb: any) {
		cb(null, picture_folder);
	},

	filename: function (req: any, file: { originalname: string }, cb: any) {
		cb(null, Date.now() + file.originalname);
	},
});

const upload = multer({
	storage,
	limits: {
		fileSize: max_upload_size,
	},
	fileFilter,
});

const router = Router();

router.post(
	"/",
	upload.single("picture"),
	async (req: Request, res: Response) => {
		try {
			res.status(200).json({
				uri: (req as MulterRequest).file.path.replace("\\", "/"),
				message: "file uploaded successfully",
			});
		} catch (error) {
			res.json({ error });
		}
	}
);

type PictureQuery = Request["query"] & {
	w: string;
	h: string;
	fit: ResizeOptions["fit"];
	position: ResizeOptions["position"];
	greyscale: boolean;
};

const id = () => {
	// Math.random should be unique because of its seeding algorithm.
	// Convert it to base 36 (numbers + letters), and grab the first 9 characters
	// after the decimal.
	return "_" + Math.random().toString(36).substr(2, 9);
};

router.get("/:picture", async (req: Request, res: Response) => {
	const { params, query } = req;
	//TODO: set default.png
	const { picture = "default.png" } = params;
	const {
		w = "0",
		h = "0",
		fit,
		position,
		greyscale = false,
	} = query as PictureQuery;
	const width = w !== "0" ? parseInt(w) : undefined;
	const height = h !== "0" ? parseInt(h) : undefined;
	const file = picture_folder + picture;
	const type =
		mime[path.extname(file.toLowerCase()).slice(1)] || "text/plain";
	if (type.substring(0, 6) !== "image/") {
		return res.status(403).end("Forbidden");
	} else {
		try {
			const parameters = {
				path: file,
				width,
				height,
				fit,
				position,
				greyscale,
			};
			const getPicture = async () => {
				const resized = await resize(parameters);
				const pathToFile = id() + ".webp"; //path.extname(file.toLowerCase());
				fs.writeFile(
					path.join(cached_folder, pathToFile),
					resized,
					(err) => {
						if (err) {
							console.log(err);
						} else {
							const key = JSON.stringify(parameters);
							cache.set(
								`picture:${key}`,
								pathToFile,
								(_, expired) => {
									if (expired !== undefined) {
										fs.unlink(
											path.join(
												cached_folder,
												expired.value
											),
											(err) => {
												if (err) {
													console.log(err);
												}
											}
										);
									}
								}
							);
						}
					}
				);

				res.set("Content-Type", "image/webp");
				res.status(200).end(resized);
			};
			const key = JSON.stringify(parameters);
			cache.get(`picture:${key}`, async (_, value: string) => {
				if (value !== null && value !== undefined) {
					// is cached
					res.set("Content-Type", "image/webp");
					res.status(200).sendFile(
						value,
						{ root: cached_folder },
						(err) => {
							if (err) {
								console.log(err);
								getPicture();
							}
						}
					);
				} else {
					// not cached
					// console.log("not cached ");
					getPicture();
				}
			});
		} catch (err) {
			console.log(err);
			res.status(500).end("Internal server error");
		}
	}
});

export default router;
