const HttpError = require("../models/http-error");
const User = require("../models/user");

const getUser = async (req, res, next) => {
  const userId = req.userData.id; // ID của người dùng
  try {
    const user = await User.findById(userId).select("-password");
    res.json({ user: user });
  } catch (errors) {
    const error = new HttpError(
      "Có lỗi khi lấy thông tin người dùng, vui lòng thử lại sau!",
      500
    );
    return next(error);
  }
};

exports.getUser = getUser;
