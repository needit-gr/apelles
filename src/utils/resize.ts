// https://sharp.pixelplumbing.com/api-resize
import sharp, { ResizeOptions } from "sharp";
import axios from "axios";
import { compression } from "../constants";
import bucket from "./gcp";
import id from "./id";

interface resizeProps {
	path: string;
	width?: number;
	height?: number;
	fit: ResizeOptions["fit"];
	position: ResizeOptions["position"];
	greyscale: boolean;
}

export const resize = async ({
	path,
	width,
	height,
	fit = sharp.fit.cover,
	position = "center",
	greyscale = false,
}: resizeProps): Promise<Buffer> => {
	const image = sharp(path);
	return image
		.greyscale(greyscale)
		.resize(width, height, {
			fit: fit,
			position: position,
		})
		.webp()
		.webp(compression)
		.toBuffer();
};

export const resizeGcp = async ({
	path,
	width,
	height,
	fit = sharp.fit.cover,
	position = "center",
	greyscale = false,
}: resizeProps): Promise<Buffer> => {
	const blob = bucket.file(path);
	const blobStream = blob.createReadStream();
	const buffer = new Promise<Buffer>((resolve, reject) => {
		const _buf = Array<any>();

		blobStream.on("data", (chunk) => _buf.push(chunk));
		blobStream.on("end", () => resolve(Buffer.concat(_buf)));
		blobStream.on("error", (err) =>
			reject(`error converting stream - ${err}`)
		);
	});
	const image = sharp(await buffer);
	return image
		.greyscale(greyscale)
		.resize(width, height, {
			fit: fit,
			position: position,
		})
		.toFormat("jpeg")
		.jpeg(compression)
		.toBuffer();
};

//const blob = bucket.file("photo-1504297050568-910d24c426d3.jpg");
//const blobStream = blob.createReadStream();
//blobStream.on("error", (err: any) => {
//	next(err);
//});
//res.status(200).set("Content-Type", "image/jpeg");
//blobStream.pipe(res);
