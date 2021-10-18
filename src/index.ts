import express from "express";
import rateLimit from "express-rate-limit";
import cors from "cors";
import dotenv from "dotenv";

import { Pictures } from "./routes";

dotenv.config();

const app = express();
app.use(
	rateLimit({
		windowMs: 5000,
		max: 5,
	})
);
app.use(cors({ origin: true }));
app.use(express.json());

const host = process.env.HOST || "http://localhost";
const port = process.env.PORT || "8000";

app.listen(port, () => {
	console.log(`⚡️ Server started at ${host}:${port} ⚡️`);
});

// app.use("/pictures", express.static("pictures"));
app.use("/pictures", Pictures);
