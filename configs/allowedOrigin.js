const allowedOrigins = [process.env.CLIENT_ORIGIN];

if (process.env.NODE_ENV !== "production") {
  allowedOrigins.push("http://localhost:3000");
  allowedOrigins.push("http://192.168.137.1");
  allowedOrigins.push("http://192.168.1.15");
  allowedOrigins.push("http://192.168.31.202"); //cong ty
}
module.exports = allowedOrigins;
