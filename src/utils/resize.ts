// https://sharp.pixelplumbing.com/api-resize
import sharp, { ResizeOptions } from "sharp";
import { compression } from "../constants";

interface resizeProps {
	path: string;
	width?: number;
	height?: number;
	fit: ResizeOptions["fit"];
	position: ResizeOptions["position"];
	greyscale: boolean;
}

const resize = async ({
	path,
	width,
	height,
	fit = sharp.fit.cover,
	position = "center",
	greyscale = false,
}: resizeProps) => {
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

export default resize;
