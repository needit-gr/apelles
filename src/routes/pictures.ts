// https://wardprice.medium.com/image-upload-with-node-js-and-typescript-c9e2ccec874b
// https://gist.github.com/joeydumont/146bf651f00d7469152b6ea311fbf27f
import path from "path";
import fs from "fs";
import { Router, Request, Response } from "express";
import multer from "multer";
import { ResizeOptions } from "sharp";
import { redis, resize } from "../utils";

interface MulterRequest extends Request {
	file: any;
}

const fileFilter = (req: unknown, file: { mimetype: string }, cb: any) => {
	if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
		cb(null, true);
	} else {
		cb(new Error("file type " + file.mimetype + " not supported"), false);
	}
};

const storage = multer.diskStorage({
	destination: function (req: any, file: { originalname: string }, cb: any) {
		cb(null, "pictures/");
	},

	filename: function (req: any, file: { originalname: string }, cb: any) {
		cb(null, Date.now() + file.originalname);
	},
});

const upload = multer({
	storage,
	limits: {
		fileSize: 1024 * 1024 * 5, // accept 5mb files max
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

const mime: Record<string, string> = {
	html: "text/html",
	txt: "text/plain",
	css: "text/css",
	gif: "image/gif",
	jpg: "image/jpeg",
	png: "image/png",
	svg: "image/svg+xml",
	js: "application/javascript",
};

const cached_folder = "pictures/cached/";

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
	// res.sendFile(path, { root: "pictures/" });
	const file = "pictures/" + picture;
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
				console.log("not cached");
				const resized = await resize(parameters);
				const pathToFile = id() + path.extname(file.toLowerCase());
				fs.writeFile(
					path.join(cached_folder, pathToFile),
					resized,
					(err) => {
						if (err) {
							return console.log(err);
						} else {
							redis.set(JSON.stringify(parameters), pathToFile);
						}
					}
				);

				res.set("Content-Type", type);
				res.status(200).end(resized);
			};
			redis.get(JSON.stringify(parameters), async (_, value) => {
				if (value !== null) {
					console.log("cache hit ", value);
					res.set("Content-Type", type);
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
