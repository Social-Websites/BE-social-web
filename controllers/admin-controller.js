const User = require("../models/user");
const Post = require("../models/post");

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

    // Convert string inputs to numbers if possible
    newUsersCountToday = parseFloat(newUsersCountToday);
    newUsersCountYesterday = parseFloat(newUsersCountYesterday);
    // Check for NaN after conversion
    if (isNaN(newUsersCountToday) || isNaN(newUsersCountYesterday)) {
        return null;
    }

    // Check for negative values
    if (newUsersCountYesterday < 0 || newUsersCountToday < 0) {
        return null;
    }

    // Node 1: Check if the count yesterday is not 0
    if (newUsersCountYesterday !== 0) {
        // Node 2: Calculate and return the growth rate
        return (newUsersCountToday - newUsersCountYesterday) / newUsersCountYesterday * 100;
    }

    // Node 3: Check if the count today is not 0
    if (newUsersCountToday !== 0) {
        // Node 4: Return 100% if there are new users today without any yesterday
        return 100;
    }

    // Node 5: No growth if both counts are 0
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


//-------------------------------POST-----------------------------------------------------
const getPaginatedPosts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 10; 
        
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
    } catch (error) {
        res.status(500).json({ error: 'Có lỗi khi lấy bài post phân trang' });
    }
};





const createPost = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new HttpError("Giá trị nhập vào không hợp lệ!", 422));
    }
    const userId = req.userData.id;
  
    const user = await User.findById(userId);
    if (!user) {
      const error = new HttpError("Không tìm thấy user!", 404);
      return next(error);
    }
  
    const { title, urlStrings } = req.body;
    const newPost = new Post({
      creator: userId,
      content: title ? title : "",
      media: urlStrings,
    });
  
    try {
      const sess = await mongoose.startSession();
      sess.startTransaction();
      await newPost.save({ session: sess });
      user.posts.push(newPost);
      await user.save({ session: sess });
      await sess.commitTransaction();
    } catch (err) {
      console.log("Bài viết 1===============: ", err);
      const error = new HttpError(
        "Có lỗi khi tạo bài viết, vui lòng thử lại!",
        500
      );
      return next(error);
    }
    res.status(201).json({ message: "Tạo bài viết mới thành công!" });
  };
//Thống kê
exports.getWeeklyOverview = getWeeklyOverview;
exports.getWeeklyPostsOverview = getWeeklyPostsOverview;
//QUản lý post
exports.getPaginatedPosts = getPaginatedPosts;
