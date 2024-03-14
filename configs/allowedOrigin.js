const allowedOrigins = [process.env.CLIENT_ORIGIN];

if (process.env.NODE_ENV !== "production"){
  allowedOrigins.push("http://localhost:3000");
  allowedOrigins.push("http://192.168.43.195");
}
module.exports = allowedOrigins;
