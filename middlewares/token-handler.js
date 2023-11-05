const jwt = require("jsonwebtoken");
const HttpError = require("../models/http-error");
const access_key = process.env.ACCESS_TOKEN_SECRET;
const refresh_key = process.env.REFRESH_TOKEN_SECRET;
const reset_key = process.env.RESET_TOKEN_SECRET;

const generateToken = (user, key = "access", expiredTime = "120") => {
  return jwt.sign(
    { id: user._id, pw: user.password, fn: user.full_name, admin: user.admin },
    key === "access" ? access_key : refresh_key,
    { expiresIn: expiredTime }
  );
};

const generateResetToken = (id) => {
  return jwt.sign({ id: id }, reset_key, { expiresIn: "5m" });
};

const generateOtpToken = (username, otp) => {
  return jwt.sign({ username: username, otp: otp }, access_key, {
    expiresIn: "2m",
  });
};

const verifyOtpToken = (token) => {
  try {
    const decoded = jwt.verify(token, access_key);
    return decoded;
  } catch (err) {
    return null;
  }
};

const verifyResetToken = (token) => {
  try {
    const decoded = jwt.verify(token, reset_key);
    return decoded;
  } catch (err) {
    return null;
  }
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
exports.generateOtpToken = generateOtpToken;
exports.generateResetToken = generateResetToken;
exports.verifyResetToken = verifyResetToken;
exports.verifyOtpToken = verifyOtpToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
