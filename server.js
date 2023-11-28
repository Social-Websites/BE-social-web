const express = require("express");
const HttpError = require("./models/http-error");
const { Server } = require("socket.io");
const User = require("./models/user");
const Notification = require("./models/notification");

const session = require("express-session");
const morgan = require("morgan");
const helmet = require("helmet");
const compress = require("compression");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

require("dotenv").config();

const route = require("./routes/index");
const app = express();

app.use(express.json());
// Use compress!
app.use(compress());
// Use Helmet!
app.use(helmet());
// HTTP  logger
app.use(morgan("combined"));

const corsOptions = {
  origin: "http://localhost:3000",
  credentials: true,
};
app.use(cors(corsOptions));
app.use(cookieParser());
app.set("view engine", "pug");

//ConnectDB
const { DBconnect } = require("./configs/ConnectDB");
DBconnect(() => {
  const server = app.listen(process.env.PORT, () => {
    console.log(`app is running on port ${process.env.PORT}`);
  });
  const io = new Server(server, {
    cors : {
      origin: "http://localhost:3000",
    }
  });
  global.onlineUsers = new Map();
  io.on("connection", (socket) => {
    //console.log(socket);
    global.chatSocket = socket;
    
    socket.on("add-user", async (userId) => { 
      onlineUsers.set(userId, socket.id);
      onlineUsers.forEach((value, key) => {
        console.log(`Key: ${key}, Value: ${value}`);
      });
      console.log("User connect");
      await User.findByIdAndUpdate({ _id: userId}, { $set: {online: true}})
      socket.broadcast.emit("getOnlineUser", {user_id: userId});
      socket.on("disconnect", async () => { 
        console.log("User disconnect");
        onlineUsers.delete(userId);
        await User.findByIdAndUpdate({ _id: userId}, { $set: {online: false}})
        socket.broadcast.emit("getOfflineUser", {user_id: userId});
      });
    });
    socket.on("send-msg", (data) => { 
      const recieveIds = data.recieve_ids;
      recieveIds.forEach((recieveId) => {
        const sendUserSocket = onlineUsers.get(recieveId);
        if (sendUserSocket) {
          socket.to(sendUserSocket).emit("msg-recieve", data);
          console.log(sendUserSocket + "gui ne");
        }
      });
    });

    socket.on("sendNotification", ({ sender_id, receiver_id, content_id, type }) => {
      let content = ""
      if(type == "like"){
        content = " liked your post";
      } else if(type == "comment"){
          content = " comment on your post";
      } else if(type == "post"){
          content = " create the post";
      }
      const liked = Notification.findOne({ sender_id, content_id }).exec();
      liked.then((check) => {
        console.log(check);
        if (check == null || type != "like") {
          const recieveIds = receiver_id;
          recieveIds.forEach( async (reciever) => {
            const newNotification = new Notification({
              user_id: reciever,
              sender_id: sender_id,
              content: content,
              content_id: content_id,
              read: false
            });
          
          // Lưu thông báo vào cơ sở dữ liệu
          await newNotification.save()
            .then(async (notification) => {
              console.log("Thông báo đã được tạo:", notification);
              const sendUserSocket = onlineUsers.get(reciever);
              const sender = await User.findById(notification.sender_id).exec();
              const data = {_id: notification._id, sender_id: notification.sender_id, senderName: sender.username, img: sender.profile_picture, content: notification.content, read: false, createAt: notification.created_at};
              
              if (sendUserSocket) {
                console.log("da gui cho " + sendUserSocket);
                socket.to(sendUserSocket).emit("getNotification", data);
              }
            })
            .catch((error) => {
              console.error("Lỗi khi tạo thông báo:", error);
            });
          });
        }
      }).catch((error) => {
        console.error("Lỗi trong quá trình thực hiện tim notification:", error);
      });
    });
  });
});

const oneDay = 1000 * 60 * 60 * 24;
// app.use(
//   session({
//     secret: "team2-uptech",
//     resave: false,
//     saveUninitialized: true,
//     cookie: { maxAge: oneDay },
//   })
// );

app.use(express.json());
app.use("/api", route);

// Sử dụng body-parser middleware
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

app.use((req, res, next) => {
  const error = new HttpError("Đường dẫn không tồn tại!", 404);
  throw error;
});

app.use((error, req, res, next) => {
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || "Lỗi không xác định!" });
});


