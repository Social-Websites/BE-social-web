const HttpError = require("../models/http-error");
const User = require("../models/user");
const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");
const {
  generateToken,
  verifyRefreshToken,
} = require("../middlewares/token-handler");

// body:{
//     "email":"",
//     "fullname":"",
//     "username":"",
//     "password":""
// }
const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("Giá trị nhập vào không hợp lệ!", 422));
  }
  const { email, fullname, username, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({
      $or: [{ "user_info.email": email }, { username: username }],
    });
  } catch (err) {
    const error = new HttpError(
      "Có lỗi trong quá trình đăng ký, vui lòng thử lại sau!",
      500
    );
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError("Tên người dùng hoặc email đã tồn tại!", 422);
    return next(error);
  }

  const saltRounds = 10;
  let hashPass;
  try {
    hashPass = await bcrypt.hash(password, saltRounds);
  } catch (err) {
    const error = new HttpError(
      "Có lỗi trong quá trình đăng ký, vui lòng thử lại sau!",
      500
    );
    return next(error);
  }

  const newUser = new User({
    username: username,
    password: hashPass,
    full_name: fullname,
    user_info: {
      email: email,
    },
    admin: false,
  });

  try {
    await newUser.save();
  } catch (err) {
    const error = new HttpError(
      "Có lỗi trong quá trình đăng ký, vui lòng thử lại sau!",
      500
    );
    return next(error);
  }

  // let accessToken;
  // let refreshToken;
  // try {
  //   accessToken = generateToken(existingUser, "access", "6h");
  //   refreshToken = generateToken(existingUser, "refresh", "7d");
  // } catch (err) {
  //   const error = new HttpError(
  //     "Có lỗi trong quá trình đăng ký, vui lòng thử lại sau!",
  //     500
  //   );
  //   return next(error);
  // }

  res.status(201);
};

const login = async (req, res, next) => {
  const { username, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ username: username, admin: false });
  } catch (err) {
    const error = new HttpError("Có lỗi xảy ra, vui lòng thử lại sau!", 500);
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError("Tên đăng nhập hoặc mật khẩu không đúng!", 401);
    return next(error);
  }

  let isValidPassword;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const error = new HttpError(
      "Có lỗi khi đăng nhập, vui lòng thử lại sau!",
      500
    );
    return next(error);
  }

  if (!isValidPassword) {
    const error = new HttpError("Tên đăng nhập hoặc mật khẩu không đúng!", 401);
    return next(error);
  }

  let accessToken;
  let refreshToken;
  try {
    accessToken = generateToken(existingUser, "access", "7h");
    refreshToken = generateToken(existingUser, "refresh", "7d");
  } catch (err) {
    const error = new HttpError(
      "Có lỗi trong quá trình đăng nhập, vui lòng thử lại sau!",
      500
    );
    return next(error);
  }

  res.cookie("jwt", refreshToken, {
    httpOnly: true, // access only by webserver
    secure: true, // https
    sameSite: "None", // cross-site cookie
    maxAge: 1000 * 60 * 60 * 24 * 7, // cookie expiry: set to match rT
  });

  res.json({ accessToken: accessToken });
};

const refresh = async (req, res, next) => {
  const cookies = req.cookies;

  if (!cookies?.jwt) {
    const error = new HttpError("Chưa xác thực!", 401);
    return next(error);
  }

  const refreshToken = cookies.jwt;
  const decodedToken = verifyRefreshToken(refreshToken);
  if (!decodedToken) {
    const error = new HttpError("Có lỗi khi xác thực!", 403);
    return next(error);
  }
  let accessToken;
  try {
    const existingUser = await User.findById(decodedToken.id);

    if (!existingUser) {
      const error = new HttpError("Không thể xác thực!", 401);
      return next(error);
    }

    accessToken = generateToken(existingUser, "access", "7h");
  } catch (err) {
    const error = new HttpError("Có lỗi xảy ra, vui lòng thử lại sau!", 500);
    return next(error);
  }

  res.json({ accessToken: accessToken });
};

const logout = (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) return res.sendStatus(204);
  res.clearCookie("jwt", { httpOnly: true, sameSite: "None", secure: true });
  res.json({ message: "Đã xóa cookie!" });
};

exports.signup = signup;
exports.login = login;
exports.refresh = refresh;
exports.logout = logout;
