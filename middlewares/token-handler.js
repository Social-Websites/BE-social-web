const jwt = require("jsonwebtoken");
const HttpError = require("../models/http-error");
const User = require("../models/user");
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

const verifyAccessToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if(!authHeader) throw new Error("Chưa xác thực!");
  if (authHeader.split(" ")[0] !== "Bearer") throw new Error("Chưa xác thực!");
  try {
    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new Error("Chưa xác thực!");
    }

    const decodedToken = jwt.verify(token, access_key);

    const user = await User.findById(decodedToken.id).select("+password");

    const isValidPassword = decodedToken.pw.trim() === user.password.trim();

    if (!isValidPassword) {
      const cookies = req.cookies;
      if (cookies?.jwt) {
        res.clearCookie("jwt", {
          httpOnly: true,
          sameSite: "None",
          secure: true,
        });
      }
      const error = new HttpError("Phiên hoạt động hết hạn!", 401);
      return next(error);
    }

    req.userData = decodedToken;
    next();
  } catch (err) {
    console.log("1---access---------------------: ", err);
    const error = new HttpError("Có lỗi khi xác thực!", 500);
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
