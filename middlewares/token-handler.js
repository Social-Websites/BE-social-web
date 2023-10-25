const jwt = require("jsonwebtoken");
const HttpError = require("../models/http-error");
const secret_key = process.env.SECRET_KEY;

const generateToken = (user, expiredTime = "120") => {
  return jwt.sign(
    { id: user._id, pw: user.password, fn: user.full_name, admin: user.admin },
    secret_key,
    { expiresIn: expiredTime }
  );
};

const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
      throw new Error("Chưa xác thực!");
    }

    const decodedToken = jwt.verify(token, secret_key);
    req.user = decodedToken;
    next();
  } catch (err) {
    const error = new HttpError("Có lỗi khi xác thực!", 401);
    return next(error);
  }
};

exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
