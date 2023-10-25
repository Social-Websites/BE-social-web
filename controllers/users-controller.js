const HttpError = require("../models/http-error");
const User = require("../models/user");
const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");
const { generateToken } = require("../middlewares/token-handler");

const getUser = async (req, res, next) => {
  const userId = req.params.userId; // ID của người dùng
  try {
    await User.find({ _id: userId })
      .then((users) => {
        res.json(users);
      })
      .catch(next);
  } catch (error) {
    next(error);
  }
};

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

  let token;
  try {
    token = generateToken(newUser, "1h");
  } catch (err) {
    const error = new HttpError(
      "Có lỗi trong quá trình đăng ký, vui lòng thử lại sau!",
      500
    );
    return next(error);
  }

  res
    .status(201)
    .json({ message: "Đăng ký tài khoản mới thành công!", token: token });
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

  let token;
  try {
    token = generateToken(existingUser, "1h");
  } catch (err) {
    const error = new HttpError(
      "Có lỗi trong quá trình đăng nhập, vui lòng thử lại sau!",
      500
    );
    return next(error);
  }

  res.status(201).json({ message: "Đăng nhập thành công!", token: token });
};

exports.signup = signup;
exports.login = login;
exports.getUser = getUser;
