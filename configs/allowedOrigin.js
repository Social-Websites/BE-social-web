const allowedOrigins = [process.env.CLIENT_ORIGIN];

if (process.env.NODE_ENV !== "production") {
  allowedOrigins.push("http://localhost:3000");
  allowedOrigins.push("http://172.16.31.187");
}
module.exports = allowedOrigins;
