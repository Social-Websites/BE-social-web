const jwt = require("jsonwebtoken");
const HttpError = require("../models/http-error");
const User = require("../models/user");
// const access_key = process.env.ACCESS_TOKEN_SECRET;
// const refresh_key = process.env.REFRESH_TOKEN_SECRET;
// const reset_key = process.env.REFRESH_TOKEN_SECRET;

const generateToken = (user, key = "access", expiredTime = "120") => {
  return jwt.sign(
    { id: user._id, pw: user.password, fn: user.full_name, admin: user.admin },
    key === "access"
      ? process.env.ACCESS_TOKEN_SECRET
      : process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: expiredTime }
  );
};

const generateResetToken = (id) => {
  return jwt.sign({ id: id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "5m",
  });
};

const generateOtpToken = (username, otp) => {
  return jwt.sign(
    { username: username, otp: otp },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: "2m",
    }
  );
};

const verifyOtpToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    return decoded;
  } catch (err) {
    return null;
  }
};

const verifyResetToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    return decoded;
  } catch (err) {
    return null;
  }
};

const verifyAccessToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader.split(" ")[0] !== "Bearer") {
    const error = new HttpError("Chưa xác thực!", 500);
    return next(error);
  }
  try {
    console.log(process.env.ACCESS_TOKEN_SECRET);
    const token = authHeader.split(" ")[1];
    if (!token) {
      const error = new HttpError("Chưa xác thực!", 500);
      return next(error);
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken.id).select("+password");

    const isValidPassword = decodedToken.pw.trim() === user.password.trim();

    if (!isValidPassword || user.banned) {
      const cookies = req.cookies;
      if (cookies?.jwt) {
        req.cookies = null;
        res.clearCookie("jwt", {
          httpOnly: true,
          sameSite: "None",
          secure: true,
        });
      }
      const error = new HttpError("Phiên hoạt động hết hạn!", 401);
      return next(error);
    } else {
      req.userData = decodedToken;
      next();
    }
  } catch (err) {
    console.log("1---access---------------------: ", err);
    const error = new HttpError("Có lỗi khi xác thực!", 500);
    return next(error);
  }
};

const verifyAdminAccessToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader.split(" ")[0] !== "Bearer") {
    const error = new HttpError("Chưa xác thực!", 500);
    return next(error);
  }
  try {
    const token = authHeader.split(" ")[1];
    if (!token) {
      const error = new HttpError("Chưa xác thực!", 500);
      return next(error);
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    if (!decodedToken.admin) {
      const error = new HttpError("Không có quyền truy cập!", 403);
      return next(error);
    }

    const user = await User.findById(decodedToken.id).select("+password");

    const isValidPassword = decodedToken.pw.trim() === user.password.trim();

    if (!isValidPassword) {
      const cookies = req.cookies;
      if (cookies?.jwt) {
        req.cookies = null;
        res.clearCookie("jwt", {
          httpOnly: true,
          sameSite: "None",
          secure: true,
        });
      }
      const error = new HttpError("Phiên hoạt động hết hạn!", 401);
      return next(error);
    } else {
      req.userData = decodedToken;
      next();
    }
  } catch (err) {
    console.log("1---access---------------------: ", err);
    const error = new HttpError("Có lỗi khi xác thực!", 500);
    return next(error);
  }
};

const verifyRefreshToken = (refreshToken) => {
  try {
    const decodedToken = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
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
exports.verifyAdminAccessToken = verifyAdminAccessToken;
