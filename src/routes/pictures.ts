// https://wardprice.medium.com/image-upload-with-node-js-and-typescript-c9e2ccec874b
// https://gist.github.com/joeydumont/146bf651f00d7469152b6ea311fbf27f
import path from "path";
import fs from "fs";
import { Router, Request, Response } from "express";
import multer from "multer";
import { ResizeOptions } from "sharp";

import { resize, resizeGcp, Cache, bucket, id } from "../utils";
import {
	mime,
	picture_folder,
	cached_folder,
	cached_folder_gcp,
	max_upload_size,
	cached_size,
	__host__,
} from "../constants";

const cache = new Cache(cached_size);

interface MulterRequest extends Request {
	file: any;
}

const fileFilter = (req: unknown, file: { mimetype: string }, cb: any) => {
	if (file.mimetype === mime.jpg || file.mimetype === mime.png) {
		cb(null, true);
	} else {
		cb(new Error("file type " + file.mimetype + " not supported"), false);
	}
};
/*
const storage = multer.diskStorage({
	destination: function (req: any, file: { originalname: string }, cb: any) {
		cb(null, picture_folder);
	},

	filename: function (req: any, file: { originalname: string }, cb: any) {
		cb(null, Date.now() + file.originalname);
	},
});
*/
const upload = multer({
	storage: multer.memoryStorage(),
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
		if (!req.file) {
			res.status(400).send("No file uploaded.");
			return;
		}
		try {
			const blob = bucket.file(Date.now() + req.file.originalname);
			const blobStream = blob.createWriteStream({
				resumable: false,
			});
			blobStream.on("error", (err: any) => {
				console.log(err);
			});
			blobStream.on("finish", () => {
				// const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
				//res.status(200).send(publicUrl);
				res.status(200).json({
					url: __host__ + blob.name,
					message: "file uploaded successfully",
				});
			});

			blobStream.end(req.file.buffer);
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

router.get("/:picture", async (req: Request, res: Response) => {
	if (req.params.picture === "favicon.ico") {
		res.status(404).send("Not found");
		return;
	}
	const { params, query } = req;
	//TODO: set default.jpg
	const { picture = "default.jpg" } = params;
	const {
		w = "0",
		h = "0",
		fit,
		position,
		greyscale = false,
	} = query as PictureQuery;
	const width = w !== "0" ? parseInt(w) : undefined;
	const height = h !== "0" ? parseInt(h) : undefined;

	const type =
		mime[path.extname(picture.toLowerCase()).slice(1)] || "text/plain";
	if (type.substring(0, 6) !== "image/") {
		return res.status(403).end("Forbidden");
	} else {
		try {
			const parameters = {
				path: picture,
				width,
				height,
				fit,
				position,
				greyscale,
			};

			const getPicture = async () => {
				const resized = await resizeGcp(parameters);
				const pathToFile = cached_folder_gcp + id() + ".jpg";
				const blob = bucket.file(pathToFile);
				const blobStream = blob.createWriteStream({
					resumable: false,
				});
				blobStream.on("error", (err: any) => {
					console.log(err);
				});
				blobStream.on("finish", () => {
					// console.log({ pathToFile });
					const key = JSON.stringify(parameters);
					cache.set(
						`picture:${key}`,
						pathToFile,
						async (_, expired) => {
							if (expired !== undefined) {
								try {
									// console.log({ delete: expired.value });
									const blob = bucket.file(expired.value);
									if ((await blob.exists())[0]) {
										bucket.file(expired.value).delete();
									}
								} catch (err) {
									console.log(err);
								}
							}
						}
					);
					res.set("Content-Type", "image/jpeg");
					res.status(200).end(resized);
				});

				blobStream.end(resized);
			};
			const key = JSON.stringify(parameters);
			cache.get(`picture:${key}`, async (_, value: string) => {
				if (value !== null && value !== undefined) {
					// is cached
					// console.log("cached");
					const blob = bucket.file(value);
					// console.log({ exists: (await blob.exists())[0] });
					if ((await blob.exists())[0]) {
						const blobStream = blob.createReadStream();
						blobStream.on("error", (err: any) => {
							console.log(err);
						});
						res.status(200).set("Content-Type", "image/jpeg");
						blobStream.pipe(res);
					} else {
						await getPicture();
					}
				} else {
					// not cached
					// console.log("not cached");
					await getPicture();
				}
			});
		} catch (err) {
			console.log(err);
			res.status(500).end("Internal server error");
		}
	}
});

export default router;
