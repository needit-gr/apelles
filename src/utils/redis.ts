import redis from "redis";

const client = redis.createClient({
	port: 6379,
});

client.on("error", (error: any) => console.error(error));

export default client;
