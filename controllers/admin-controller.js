const User = require("../models/user");
const Post = require("../models/post");

const getWeeklyOverviewCombined = async (res) => {
  try {
      const today = new Date();
      const currentDayOfWeek = today.getDay();

      const daysToMonday = (currentDayOfWeek + 6) % 7;
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - daysToMonday);
      startOfWeek.setHours(0, 0, 0, 0);

      const chartArray = [];
      const postArray = [];

      for (let i = 0; i <= daysToMonday; i++) {
          const currentDate = new Date(startOfWeek);
          currentDate.setDate(startOfWeek.getDate() + i);

          const nextDate = new Date(currentDate);
          nextDate.setDate(currentDate.getDate() + 1);
          nextDate.setSeconds(nextDate.getSeconds() - 1);

          const dailyCountUsers = await getDailyUserCount(currentDate, nextDate);
          chartArray.push(dailyCountUsers);

          const dailyPosts = await getPosts(currentDate, nextDate);
          postArray.push(dailyPosts);
      }

      const newUsersCountToday = chartArray[daysToMonday];
      const newUsersCountYesterday = chartArray[daysToMonday - 1];

      const isGrowthUsers = newUsersCountToday >= newUsersCountYesterday;
      const percentUsers = calculatePercent(newUsersCountToday, newUsersCountYesterday);

      const postsCountToday = postArray[daysToMonday];
      const postsCountYesterday = postArray[daysToMonday - 1];

      const isGrowthPosts = postsCountToday >= postsCountYesterday;
      const percentPosts = calculatePercent(postsCountToday, postsCountYesterday);

      res.json({
          overview: [
              {
                  title: 'new users',
                  count: newUsersCountToday,
                  isGrowth: isGrowthUsers,
                  percent: percentUsers,
                  chartArray: chartArray,
              },
              {
                  title: 'new posts',
                  count: postsCountToday,
                  isGrowth: isGrowthPosts,
                  percent: percentPosts,
                  postArray: postArray,
              },
          ],
      });

  } catch (error) {
      console.error('Error getting combined weekly overview:', error);
      res.status(500).json({ error: 'Error getting combined weekly overview' });
  }
};

//THỐNG KÊ

//////////////////////////////// 
const calculatePercent = (newUsersCountToday, newUsersCountYesterday) => {
    newUsersCountToday = parseFloat(newUsersCountToday); 
    newUsersCountYesterday = parseFloat(newUsersCountYesterday); 
    if (isNaN(newUsersCountToday)  || isNaN(newUsersCountYesterday 
        || newUsersCountYesterday < 0  || newUsersCountToday < 0)) {
        return null; (7)
    }
    if (newUsersCountYesterday !== 0) {
        return (newUsersCountToday - newUsersCountYesterday) / newUsersCountYesterday * 100; (9)
    }
    if (newUsersCountToday !== 0) {     
        return 100; 
    }
    return 0; 
};

const getDailyUserCount = async (startDate, endDate) => {
    try {
        const dailyCount = await User.countDocuments({
            created_at: { $gte: startDate, $lt: endDate },
        });
        return dailyCount;
    } catch (error) {
        throw error;
    }
};



const getPosts = async (startDate, endDate) => {
  try {
    const dailyCount = await Post.countDocuments({
        created_at: { $gte: startDate, $lt: endDate },
    });
    return dailyCount;
} catch (error) {
    throw error;
}
};


///////////////////////////////////////////////////////////////////////

//USER
const getUserPaginated = async (req, res) => {
  try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const searchQuery = req.query.search || null;

      if (page < 1 || limit < 1) {
          return res.status(400).json({ message: 'Invalid page or limit value' });
      }

      let query = {};

      if (searchQuery) {
          query = { full_name: { $regex: searchQuery, $options: 'i' } };
      }

      const skip = (page - 1) * limit;

      const users = await User.find(query)
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(limit);

      const totalUsers = await User.countDocuments(query);

      res.json({
          users: users,
          currentPage: page,
          totalPages: Math.ceil(totalUsers / limit),
          totalUsers: totalUsers,
      });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Encountered an error while retrieving paginated users' });
  }
};



const banUser = async (req, res) => {
  const userIdToBan = req.params.userId;

  try {
    // Tìm người dùng cần cấm
    const userToBan = await User.findById(userIdToBan);

    if (!userToBan) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng để cấm.' });
    }

    // Cập nhật trạng thái cấm và lưu lại
    userToBan.ban = true;
    await userToBan.save();

    res.status(200).json({ message: 'Người dùng đã được cấm thành công.' });
  } catch (error) {
    console.error('Lỗi khi cấm người dùng:', error);
    res.status(500).json({ message: 'Đã xảy ra lỗi trong quá trình cấm người dùng.' });
  }
};

const unbanUser = async (req, res) => {
    const userIdToUnban = req.params.userId;
  
    try {
      // Tìm người dùng cần bỏ cấm
      const userToUnban = await User.findById(userIdToUnban);
  
      if (!userToUnban) {
        return res.status(404).json({ message: 'Không tìm thấy người dùng để bỏ cấm.' });
      }
  
      // Cập nhật trạng thái cấm và lưu lại
      userToUnban.ban = false;
      await userToUnban.save();
  
      res.status(200).json({ message: 'Người dùng đã được bỏ cấm thành công.' });
    } catch (error) {
      console.error('Lỗi khi bỏ cấm người dùng:', error);
      res.status(500).json({ message: 'Đã xảy ra lỗi trong quá trình bỏ cấm người dùng.' });
    }
  };
//-------------------------------POST-----------------------------------------------------
const getPaginatedPosts = async (req, res) => {
  try {
      const page = parseInt(req.query.page) || 1; 
      const limit = parseInt(req.query.limit) || 10; 
      const searchQuery = req.query.search || null; 

      if (page < 1 || limit < 1) {
          return res.status(400).json({ message: 'Invalid page or limit value' });
      }
      let query = {};

      if (searchQuery) {
          query = { content: { $regex: searchQuery, $options: 'i' } };
      }

      const skip = (page - 1) * limit;

      const posts = await Post.find(query)
          .sort({ created_at: -1 }) 
          .skip(skip)
          .limit(limit);

      const totalPosts = await Post.countDocuments(query);

      res.json({
          posts: posts,
          currentPage: page,
          totalPages: Math.ceil(totalPosts / limit),
          totalPosts: totalPosts,
      });
  } catch (error) {
      res.status(500).json({ message: 'Encountered an error while retrieving paginated posts' });
  }
};

//Xóa bài viết
const deletePostByAdmin = async (req, res) => {
    const postId = req.params.postId;
    const newDeletedByValue = 'ADMIN';
  
    try {
      const updatedPost = await Post.findOneAndUpdate(
        { _id: postId },
        { $set: { deleted_by: newDeletedByValue } },
        { new: true }
      );
  
      if (!updatedPost) {
        return res.status(404).json({ message: 'Không tìm thấy bài viết để xóa.' });
      }
      return res.status(200).json({ message: 'Bài viết đã được xóa thành công.' });
    } catch (error) {
      return res.status(500).json({ message: 'Đã xảy ra lỗi trong quá trình xóa bài viết.' });
    }
  };

const unDeletePostByAdmin = async (req, res) => {
  const postId = req.params.postId;  
  try {
    const updatedPost = await Post.findOneAndUpdate(
      { _id: postId },
      { $unset: { deleted_by: 1 } }, // Sử dụng $unset để xóa trường deleted_by
      { new: true }
  );

    if (!updatedPost) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }
    return res.status(200).json({ message: 'Bài viết đã được mở xóa thành công.' });
  } catch (error) {
    return res.status(500).json({ message: 'Đã xảy ra lỗi trong quá trình xóa bài viết.' });
  }
};
  




//Thống kê
exports.getWeeklyOverviewCombined = getWeeklyOverviewCombined;
//QUản lý post
exports.getPaginatedPosts = getPaginatedPosts;
exports.deletePostByAdmin = deletePostByAdmin;
exports.unDeletePostByAdmin = unDeletePostByAdmin;
//Quản lý user
exports.getUserPaginated = getUserPaginated;
exports.banUser = banUser;
exports.unbanUser = unbanUser;


