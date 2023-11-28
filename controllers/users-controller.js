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
      friends: 1,
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
      user_info: { bio: user.bio },
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
    user.friends = user.friends.map((friend) => ({
      ...friend._doc,
      is_your_friend: yourList.friends.some((yourFriend) =>
        yourFriend.equals(friend._id)
      ),
      is_friend_request_sent: yourList.friend_requests_sent.includes(
        friend._id
      ),
    }));

    res.json({ friends: user.friends });
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
      path: "friends",
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
exports.searchUsers = searchUsers;
exports.getUser = getUser;
exports.getUserByUsername = getUserByUsername;
exports.getUserFriendsListByUsername = getUserFriendsListByUsername;
exports.getFriendRequestsList = getFriendRequestsList;
