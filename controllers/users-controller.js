const HttpError = require("../models/http-error");
const User = require("../models/user");

const getUser = async (req, res, next) => {
  const userId = req.userData.id;
  console.log(userId); // ID của người dùng
  try {
    const user = await User.findById(userId, {
      username: 1,
      profile_picture: 1,
      full_name: 1,
    });
    res.json({ user: user });
  } catch (errors) {
    const error = new HttpError(
      "Có lỗi khi lấy thông tin người dùng, vui lòng thử lại sau!",
      500
    );
    return next(error);
  }
};

const getUserByUsername = async (req, res, next) => {
  const username = req.params.username;
  try {
    const user = await User.findOne({ username: username });
    res.json({ user: user });
  } catch (errors) {
    const error = new HttpError(
      "Có lỗi khi lấy thông tin người dùng, vui lòng thử lại sau!",
      500
    );
    return next(error);
  }
};

const searchUsers = async (req, res, next) => {
  const searchText = req.query.searchText;
  console.log(searchText);
  try {
    const regex = new RegExp(searchText, "i");
    if (searchText) {
      const users = await User.find({
        $or: [{ username: regex }, { full_name: regex }],
      }).limit(50); // Giới hạn trả về 50 kết quả
      res.json(users);
    } else {
      res.json([]);
    }
  } catch (error) {
    return next(error + searchText);
  }
};
exports.searchUsers = searchUsers;
exports.getUser = getUser;
exports.getUserByUsername = getUserByUsername;
