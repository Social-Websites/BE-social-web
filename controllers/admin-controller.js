const User = require("../models/user");
const Post = require("../models/post");

//THỐNG KÊ
const getWeeklyOverview = async (res) => {
    try {
        const today = new Date();
        const currentDayOfWeek = today.getDay();

        const daysToMonday = (currentDayOfWeek + 6) % 7;
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - daysToMonday);
        startOfWeek.setHours(0, 0, 0, 0);

        const chartArray = [];

        for (let i = 0; i <= daysToMonday; i++) {
            const currentDate = new Date(startOfWeek);
            currentDate.setDate(startOfWeek.getDate() + i);

            const nextDate = new Date(currentDate);
            nextDate.setDate(currentDate.getDate() + 1);
            nextDate.setSeconds(nextDate.getSeconds() - 1);

            const dailyCount = await getDailyUserCount(currentDate, nextDate);
            chartArray.push(dailyCount);
        }

        const newUsersCountToday = chartArray[daysToMonday];
        const newUsersCountYesterday = chartArray[daysToMonday - 1];

        const isGrowth = newUsersCountToday > newUsersCountYesterday;
        const percent = calculatePercent(newUsersCountToday, newUsersCountYesterday);

        res.json({
            title: 'new users',
            count: newUsersCountToday,
            isGrowth: isGrowth,
            percent: percent,
            chartArray: chartArray,
        });

    } catch (error) {
        console.error('Lỗi khi lấy tổng quan hàng tuần:', error);
        res.status(500).json({ error: 'Có lỗi khi lấy tổng quan hàng tuần' });
    }
};

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

const getWeeklyPostsOverview = async (res) => {
    try {
        const today = new Date();
        const currentDayOfWeek = today.getDay(); // Lấy ngày trong tuần của ngày hiện tại

        // Tính toán số ngày cần truy vấn để lấy từ thứ 2 đến ngày hiện tại
        const daysToMonday = (currentDayOfWeek + 6) % 7; // (currentDayOfWeek + 6) % 7 sẽ đưa chúng ta đến thứ 2 gần nhất

        // Lấy ngày đầu tuần (ngày thứ 2)
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - daysToMonday);
        startOfWeek.setHours(0, 0, 0, 0);

        // Tạo mảng chứa số bài đăng mới từng ngày trong tuần
        const chartArray = [];
        for (let i = 0; i <= daysToMonday; i++) {
            const currentDate = new Date(startOfWeek);
            currentDate.setDate(startOfWeek.getDate() + i);

            const nextDate = new Date(currentDate);
            nextDate.setDate(currentDate.getDate() + 1);
            nextDate.setSeconds(nextDate.getSeconds() - 1);

            // Thực hiện truy vấn để lấy số bài đăng mới trong khoảng thời gian từ currentDate đến nextDate
            const dailyPostsCount = await Post.countDocuments({
                created_at: { $gte: currentDate, $lt: nextDate },
            });

            chartArray.push(dailyPostsCount);
        }

        console.log(chartArray);

        // Thực hiện truy vấn cho mỗi ngày trong tuần
        res.json({
            title: 'new posts',
            count: chartArray[daysToMonday], // Số bài đăng mới của ngày hiện tại
            isGrowth: null,
            percent: null,
            chartArray: chartArray,
        });

    } catch (error) {
        console.error('Lỗi khi lấy tổng quan hàng tuần của bài đăng:', error);
        res.status(500).json({ error: 'Có lỗi khi lấy tổng quan hàng tuần của bài đăng' });
    }
};
//USER
const getUserPaginated = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
  
      if (page < 1 || limit < 1) {
        return res.status(400).json({ message: 'Invalid page or limit value' });
      }
  
      const skip = (page - 1) * limit;
  
      const users = await User.find({})
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit);
  
      const totalUsers = await User.countDocuments();
  
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

        if (page < 1 || limit < 1) {
            return res.status(400).json({ message: 'Invalid page or limit value' });
        }
        
        const skip = (page - 1) * limit;

        const posts = await Post.find({})
            .sort({ created_at: -1 }) 
            .skip(skip)
            .limit(limit);

        const totalPosts = await Post.countDocuments();

        res.json({
            posts: posts,
            currentPage: page,
            totalPages: Math.ceil(totalPosts / limit),
            totalPosts: totalPosts,
        });
    } catch (message) {
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
exports.getWeeklyOverview = getWeeklyOverview;
exports.getWeeklyPostsOverview = getWeeklyPostsOverview;
//QUản lý post
exports.getPaginatedPosts = getPaginatedPosts;
exports.deletePostByAdmin = deletePostByAdmin;
exports.unDeletePostByAdmin = unDeletePostByAdmin;
//Quản lý user
exports.getUserPaginated = getUserPaginated;
exports.banUser = banUser;
exports.unbanUser = unbanUser;


