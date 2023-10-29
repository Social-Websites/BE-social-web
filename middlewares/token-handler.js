const jwt = require("jsonwebtoken");
const HttpError = require("../models/http-error");
const access_key = process.env.ACCESS_TOKEN_SECRET;
const refresh_key = process.env.REFRESH_TOKEN_SECRET;

const generateToken = (user, key = "access", expiredTime = "120") => {
  return jwt.sign(
    { id: user._id, pw: user.password, fn: user.full_name, admin: user.admin },
    key === "access" ? access_key : refresh_key,
    { expiresIn: expiredTime }
  );
};

const verifyAccessToken = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
      throw new Error("Chưa xác thực!");
    }

    const decodedToken = jwt.verify(token, access_key);
    req.userData = decodedToken;
    next();
  } catch (err) {
    const error = new HttpError("Có lỗi khi xác thực!", 401);
    return next(error);
  }
};

const verifyRefreshToken = (refreshToken) => {
  try {
    const decodedToken = jwt.verify(refreshToken, refresh_key);
    return decodedToken;
  } catch (err) {
    return null;
  }
};

exports.generateToken = generateToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
