const mongoose = require("mongoose");
const HttpError = require("../models/http-error");
const User = require("../models/user");
const { getValidFields } = require("../util/validators");

const getUser = async (req, res, next) => {
  const userId = req.userData.id;
  console.log(userId); // ID của người dùng
  try {
    const user = await User.findById(userId, {
      username: 1,
      profile_picture: 1,
      full_name: 1,
      friends: 1,
      user_info: { bio: 1 },
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
  const userId = req.userData.id;
  const username = req.params.username;

  try {
    const user = await User.findOne({ username: username });

    if (!user) {
      const error = new HttpError("Người dùng không tồn tại", 404);
      return next(error);
    }

    // Kiểm tra xem userId có nằm trong mảng friends hay friend_requests không
    const isFriend = user.friends.includes(userId);
    const isFriendRequestSent = user.friend_requests.includes(userId);

    // Tính toán số lượng bài viết, số lượng bạn bè, và số lượng yêu cầu kết bạn
    const postsCount = user.posts.length;
    const friendsCount = user.friends.length;
    const friendRequestsCount = user.friend_requests.length;

    // Tạo đối tượng mới chứa thông tin cần thiết
    const result = {
      _id: user._id,
      username: user.username,
      profile_picture: user.profile_picture,
      full_name: user.full_name,
      online: user.online,
      last_online: user.last_online,
      admin: user.admin,
      user_info: { bio: user?.user_info.bio ? user?.user_info.bio : "" },
      is_friend: isFriend,
      is_friend_request_sent: isFriendRequestSent,
      posts_count: postsCount,
      friends_count: friendsCount,
      friend_requests_count: friendRequestsCount,
    };
    res.json({ user: result });
  } catch (err) {
    console.error("======Lấy người dùng: ", err);
    const error = new HttpError(
      "Có lỗi khi lấy thông tin người dùng, vui lòng thử lại sau!",
      500
    );
    return next(error);
  }
};

const getUserFriendsListByUsername = async (req, res, next) => {
  const userId = req.userData.id;
  const username = req.params.username;
  const page = Math.max(1, parseInt(req.query.page)) || 1;
  const limit = Math.max(20, parseInt(req.query.limit)) || 20;

  try {
    const user = await User.findOne({ username: username }).populate({
      path: "friends",
      select: "username full_name profile_picture",
      options: {
        limit: limit,
        skip: (page - 1) * limit,
      },
    });

    if (!user) {
      const error = new HttpError("Người dùng không tồn tại", 404);
      return next(error);
    }

    // Nếu xem profile của chính mình, trả về danh sách bạn bè mà không thêm trường is_your_friend
    if (user._id.equals(userId)) {
      res.json({ friends: user.friends });
      return;
    }

    // Nếu xem profile của người khác, lấy danh sách bạn bè của người đó
    const yourList = await User.findById(userId).select(
      "friends friend_requests_sent"
    );

    // Kiểm tra và thêm trường is_your_friend cho từng phần tử trong mảng friends
    const friendsList = user.friends.map((friend) => ({
      ...friend._doc,
      is_your_friend: yourList.friends.some((yourFriend) =>
        yourFriend.equals(friend._id)
      ),
      is_friend_request_sent: yourList.friend_requests_sent.includes(
        friend._id
      ),
    }));

    res.json({ friends: friendsList });
  } catch (err) {
    console.error("======Lấy danh sách bạn bè của người dùng: ", err);
    const error = new HttpError(
      "Có lỗi khi lấy thông tin người dùng, vui lòng thử lại sau!",
      500
    );
    return next(error);
  }
};

const getFriendRequestsList = async (req, res, next) => {
  const userId = req.userData.id;
  const page = Math.max(1, parseInt(req.query.page)) || 1;
  const limit = Math.max(20, parseInt(req.query.limit)) || 20;

  try {
    // Tìm user theo userId và populate friend_requests
    const user = await User.findById(userId).populate({
      path: "friend_requests",
      select: "username full_name profile_picture",
      options: {
        limit: limit,
        skip: (page - 1) * limit,
        sort: { created_at: -1 },
      },
    });
    if (!user) {
      const error = new HttpError("Người dùng không tồn tại", 404);
      return next(error);
    }

    res.json({ friend_requests: user.friend_requests });
  } catch (err) {
    console.error("======Lấy danh sách yêu cầu kết bạn: ", err);
    const error = new HttpError(
      "Có lỗi khi lấy danh sách yêu cầu kết bạn, vui lòng thử lại sau!",
      500
    );
    return next(error);
  }
};

const sendAddFriendRequest = async (req, res, next) => {
  const userId = req.userData.id;
  const userIdToSend = req.params.userId;

  try {
    const [user, userToSend] = await Promise.all([
      User.findById(userId).select("friend_requests_sent"),
      User.findById(userIdToSend).select("friend_requests"),
    ]);
    if (!user) {
      const error = new HttpError("Không tìm thấy user!", 404);
      return next(error);
    }
    if (!userToSend) {
      const error = new HttpError("Không tìm thấy user cần kết bạn!", 404);
      return next(error);
    }

    const sess = await mongoose.startSession();
    sess.startTransaction();
    user.friend_requests_sent.push(userToSend._id);
    await user.save({ session: sess });
    userToSend.friend_requests.push(user._id);
    await userToSend.save({ session: sess });

    await sess.commitTransaction();
  } catch (err) {
    console.log("Add Friend 1===============: ", err);
    const error = new HttpError(
      "Có lỗi khi gửi lời mời, vui lòng thử lại!",
      500
    );
    return next(error);
  }

  res.json({ message: "Đã gửi lời mời!" });
};

const acceptAddFriendRequest = async (req, res, next) => {
  const userId = req.userData.id;
  const userIdToAdd = req.params.userId;

  try {
    const [user, userToAdd] = await Promise.all([
      User.findById(userId).select("friends friend_requests"),
      User.findById(userIdToAdd).select("friends friend_requests_sent"),
    ]);
    if (!user) {
      const error = new HttpError("Không tìm thấy user!", 404);
      return next(error);
    }
    if (!userToAdd) {
      const error = new HttpError("Không tìm thấy user để chấp nhận!", 404);
      return next(error);
    }

    const sess = await mongoose.startSession();
    sess.startTransaction();

    // Thêm vào mảng friends của user và pull từ friend_requests_sent của user
    user.friend_requests.pull(userToAdd._id);
    user.friends.push(userToAdd._id);

    // Pull từ friend_requests của userToAdd
    userToAdd.friend_requests_sent.pull(user._id);
    userToAdd.friends.push(user._id);

    await user.save({ session: sess });
    await userToAdd.save({ session: sess });

    await sess.commitTransaction();
  } catch (err) {
    console.log("Accept Friend Request==============: ", err);
    const error = new HttpError("Có lỗi khi chấp nhận, vui lòng thử lại!", 500);
    return next(error);
  }

  res.json({ message: "Đã chấp nhận lời mời kết bạn!" });
};

const removeAddFriendRequest = async (req, res, next) => {
  const userId = req.userData.id;
  const userIdToRemove = req.params.userId;

  try {
    const [user, userToRemove] = await Promise.all([
      User.findById(userId).select("friend_requests_sent"),
      User.findById(userIdToRemove).select("friend_requests"),
    ]);
    if (!user) {
      const error = new HttpError("Không tìm thấy user!", 404);
      return next(error);
    }
    if (!userToRemove) {
      const error = new HttpError(
        "Không tìm thấy user cần rút lại lời mời!",
        404
      );
      return next(error);
    }

    const sess = await mongoose.startSession();
    sess.startTransaction();

    // Pull từ cả hai mảng friend_requests_sent và friend_requests
    user.friend_requests_sent.pull(userToRemove._id);
    userToRemove.friend_requests.pull(user._id);

    await user.save({ session: sess });
    await userToRemove.save({ session: sess });

    await sess.commitTransaction();
  } catch (err) {
    console.log("Reject Friend Request==============: ", err);
    const error = new HttpError(
      "Có lỗi khi rút lời mời, vui lòng thử lại!",
      500
    );
    return next(error);
  }

  res.json({ message: "Đã rút lại lời mời kết bạn!" });
};

const rejectAddFriendRequest = async (req, res, next) => {
  const userId = req.userData.id;
  const userIdToReject = req.params.userId;

  try {
    const [user, userToReject] = await Promise.all([
      User.findById(userId).select("friend_requests"),
      User.findById(userIdToReject).select("friend_requests_sent"),
    ]);
    if (!user) {
      const error = new HttpError("Không tìm thấy user!", 404);
      return next(error);
    }
    if (!userToReject) {
      const error = new HttpError("Không tìm thấy user cần từ chối!", 404);
      return next(error);
    }

    const sess = await mongoose.startSession();
    sess.startTransaction();

    // Pull từ cả hai mảng friend_requests_sent và friend_requests
    user.friend_requests.pull(userToReject._id);
    userToReject.friend_requests_sent.pull(user._id);

    await user.save({ session: sess });
    await userToReject.save({ session: sess });

    await sess.commitTransaction();
  } catch (err) {
    console.log("Reject Friend Request==============: ", err);
    const error = new HttpError("Có lỗi khi từ chối, vui lòng thử lại!", 500);
    return next(error);
  }

  res.json({ message: "Đã từ chối lời mời kết bạn!" });
};

const unFriend = async (req, res, next) => {
  const userId = req.userData.id;
  const friendId = req.params.friendId;

  try {
    const [user, friend] = await Promise.all([
      User.findById(userId).select("friends"),
      User.findById(friendId).select("friends"),
    ]);

    if (!user || !friend) {
      const error = new HttpError("Không tìm thấy người dùng!", 404);
      return next(error);
    }

    const sess = await mongoose.startSession();
    sess.startTransaction();

    // Pull friendId từ mảng friends của cả hai user
    user.friends.pull(friendId);
    friend.friends.pull(userId);

    await user.save({ session: sess });
    await friend.save({ session: sess });

    await sess.commitTransaction();
  } catch (err) {
    console.log("Unfriend==============: ", err);
    const error = new HttpError(
      "Có lỗi khi hủy kết bạn, vui lòng thử lại!",
      500
    );
    return next(error);
  }

  res.json({ message: "Đã hủy kết bạn!" });
};

const searchUsers = async (req, res, next) => {
  const searchText = req.query.searchText;
  console.log(searchText);
  try {
    const regex = new RegExp(searchText, "i");
    if (searchText) {
      const users = await User.find({
        $or: [
          { username: regex },
          { full_name: regex },
          { search_keyword: regex },
        ],
      }).limit(50); // Giới hạn trả về 50 kết quả
      res.json(users);
    } else {
      res.json([]);
    }
  } catch (error) {
    return next(error + searchText);
  }
};

const updateUserFields = async (userId, updateFields) => {
  try {
    // Sử dụng findByIdAndUpdate để cập nhật nhiều trường
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true }
    );

    if (!user) {
      throw new HttpError("Không tìm thấy người dùng!", 404);
    }

    return user;
  } catch (err) {
    console.error("Lỗi khi cập nhật thông tin người dùng: ", err);
    throw new HttpError(
      "Có lỗi khi cập nhật thông tin người dùng, vui lòng thử lại!",
      500
    );
  }
};

const transformObjectFields = (fields, prefix = "") => {
  const transformedFields = {};

  for (const key in fields) {
    const fieldKey = prefix ? `${prefix}.${key}` : key;
    const fieldValue = fields[key];

    if (typeof fieldValue === "object") {
      // Nếu là một đối tượng, tiếp tục đệ quy để biến đổi các trường con
      const transformedSubFields = transformObjectFields(fieldValue, fieldKey);
      Object.assign(transformedFields, transformedSubFields);
    } else {
      // Nếu không phải đối tượng, thêm trường vào danh sách đã biến đổi
      transformedFields[fieldKey] = fieldValue;
    }
  }

  return transformedFields;
};

const updateProfile = async (req, res, next) => {
  const userId = req.userData.id;
  const updateFields = req.body; // Chứa các trường cần cập nhật

  // Kiểm tra và lọc các trường hợp lệ
  const validFields = [
    "full_name",
    "bio",
    "email",
    "profile_picture",
    "date_of_birth",
    "gender",
    "phone",
    "hometown",
    "self_lock",
    "search_keyword",
  ];
  // Lọc và chỉ giữ lại các trường hợp lệ
  const validUpdateFields = getValidFields(updateFields, validFields);

  if (Object.keys(validUpdateFields).length === 0) {
    const error = new HttpError("Các trường gửi đi không hợp lệ!", 400);
    return next(error);
  }
  const transformedFields = transformObjectFields(validUpdateFields);
  console.log(transformedFields);

  try {
    const user = await updateUserFields(userId, transformedFields);
    res.json({ message: "Đã cập nhật thông tin người dùng!" });
  } catch (err) {
    return next(err);
  }
};

const updatePassword = async (req, res, next) => {
  const userId = req.userData.id;
  const { oldPass, newPass } = req.body;

  try {
    const existingUser = await User.findOne({
      _id: userId,
      admin: false,
    }).select("+password");

    if (!existingUser) {
      const error = new HttpError("Người dùng không tồn tại!", 401);
      return next(error);
    }

    console.log(existingUser);

    const isValidPassword = await existingUser.comparePassword(oldPass);

    if (!isValidPassword) {
      const error = new HttpError("Mật khẩu cũ không chính xác!", 403);
      return next(error);
    }

    existingUser.password = newPass;

    await existingUser.save();
  } catch (err) {
    const error = new HttpError(
      "Có lỗi trong quá trình đổi mật khẩu, vui lòng thử lại sau!",
      500
    );
    return next(error);
  }

  res.json({ message: "Đổi mật khẩu thành công!" });
};

exports.searchUsers = searchUsers;
exports.getUser = getUser;
exports.getUserByUsername = getUserByUsername;
exports.getUserFriendsListByUsername = getUserFriendsListByUsername;
exports.getFriendRequestsList = getFriendRequestsList;
exports.sendAddFriendRequest = sendAddFriendRequest;
exports.acceptAddFriendRequest = acceptAddFriendRequest;
exports.removeAddFriendRequest = removeAddFriendRequest;
exports.rejectAddFriendRequest = rejectAddFriendRequest;
exports.unFriend = unFriend;
exports.updateProfile = updateProfile;
exports.updatePassword = updatePassword;
