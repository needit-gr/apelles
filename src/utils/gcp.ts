import { Storage } from "@google-cloud/storage";

const storage = new Storage({ keyFilename: "./serviceAccount.json" });
const bucket = storage.bucket(process.env.GCLOUD_STORAGE_BUCKET);

export default bucket;
