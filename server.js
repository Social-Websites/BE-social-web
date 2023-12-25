const express = require("express");
const HttpError = require("./models/http-error");
const { Server } = require("socket.io");
const User = require("./models/user");
const Notification = require("./models/notification");
const Group = require("./models/community_group");
const allowedOrigins = require("./configs/allowedOrigin");

const session = require("express-session");
const helmet = require("helmet");
const compress = require("compression");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const route = require("./routes/index");
const app = express();

app.use(express.json());
// Use compress!
app.use(compress());
// Use Helmet!
app.use(helmet());
// HTTP  logger

if (process.env.NODE_ENV !== "production") {
  const morgan = require("morgan");
  require("dotenv").config();
  // Sử dụng morgan trong môi trường development
  app.use(morgan("combined"));
}

const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS hihihihi!"));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(cookieParser());
app.set("view engine", "pug");

//ConnectDB
const { DBconnect } = require("./configs/connectDB");
const notification = require("./models/notification");
DBconnect(() => {
  const server = app.listen(process.env.PORT, () => {
    console.log(`app is running on port ${process.env.PORT}`);
  });
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
    },
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
      await User.findByIdAndUpdate({ _id: userId }, { $set: { online: true } });
      socket.broadcast.emit("getOnlineUser", { user_id: userId });
      socket.on("disconnect", async () => {
        console.log("User disconnect");
        onlineUsers.delete(userId);
        await User.findByIdAndUpdate(
          { _id: userId },
          { $set: { online: false, last_online: Date.now() } }
        );
        socket.broadcast.emit("getOfflineUser", { user_id: userId });
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

    socket.on("return-chat", (data) => {
      const recieveIds = data.recieve_ids;
      recieveIds.forEach((recieveId) => {
        const sendUserSocket = onlineUsers.get(recieveId);
        if (sendUserSocket) {
          socket.to(sendUserSocket).emit("return-recieve", data);
          console.log(sendUserSocket + "gui ne");
        }
      });
    });

    socket.on("delete-msg", (data) => {
      const recieveIds = data.recieve_ids;
      recieveIds.forEach((recieveId) => {
        const sendUserSocket = onlineUsers.get(recieveId);
        if (sendUserSocket) {
          socket.to(sendUserSocket).emit("msg-deleted", data);
          console.log(sendUserSocket + "gui ne");
        }
      });
    });

    socket.on(
      "sendNotification",
      ({ sender_id, receiver_id, content_id, reponse, type, group_id }) => {
        let content = "";
        let ownerGroup;
        if (type == "like") {
          content = " liked your post";
        } else if (type == "comment") {
          content = " comment on your post";
        } else if (type == "reply") {
          content = " reply your comment";
        } else if (type == "post") {
          content = " create the post";
        } else if (type == "request") {
          content = " send you a friend request";
        } else if (type == "accept") {
          content = " accept your friend request";
        } else if (type == "reject") {
          content = " reject your friend request";
        } else if (type == "hide") {
          content = " admin deleted your post";
        } else if (type == "acceptGroup") {
          content = " has been a member of your group";
        } else if (type == "rejectGroup") {
          content = " reject your request";
        } else if (type == "acceptMember") {
          content = " You has been a member group";
        } else if (type == "rejectMember") {
          content = " reject your request";
        } else if (type == "inviteGroup") {
          content = " invite you to group";
        } else if (type == "requestGroup") {
          content = " want to join ";
        } else if (type == "postGroup") {
          content = " has a new post";
          ownerGroup = UserToGroup.findOne({ group: group_id, status: "ADMIN" }).exec();
        }

        if (type == "remove") {
          const requested = Notification.findOne({
            sender_id,
            content_id,
          }).exec();
          requested.then((notification) => {
            const recieveIds = receiver_id || ownerGroup;
            recieveIds.forEach(async (reciever) => {
              const sendUserSocket = onlineUsers.get(reciever);
              const data = { content_id: notification?._id, remove: true };
              if (sendUserSocket) {
                console.log("da gui cho " + sendUserSocket);
                socket.to(sendUserSocket).emit("getNotification", data);
                await Notification.deleteOne({ _id: notification?._id }).exec();
              }
            });
          });
        } else {
          console.log("toi day chua");
          if (reponse !== null) {
            console.log("xoa a");
            const requested = Notification.findOne({
              sender_id: receiver_id[0],
              user_id: sender_id,
              content_id: null,
              reponse: null,
            }).exec();
            console.log(requested);
            requested.then(async (notification) => {
              await Notification.deleteOne({ _id: notification?._id }).exec();
            });
          }
          const liked = Notification.findOne({ sender_id, content_id }).exec();
          liked
            .then((check) => {
              console.log(check);
              if (check == null || type != "like") {
                const recieveIds = receiver_id;
                recieveIds.forEach(async (reciever) => {
                  if ((type != "reject" && type != "rejectGroup" && type != "rejectMember") && sender_id != reciever) {
                    const newNotification = new Notification({
                      user_id: reciever,
                      sender_id: sender_id,
                      content: content,
                      content_id: content_id,
                      group_id: group_id,
                      reponse: reponse,
                      read: false,
                    });

                    // Lưu thông báo vào cơ sở dữ liệu
                    await newNotification
                      .save()
                      .then(async (notification) => {
                        console.log("Thông báo đã được tạo:", notification);
                        const sendUserSocket = onlineUsers.get(reciever);
                        let data;
                        if(group_id){
                          const sender = await User.findById(
                            notification.sender_id
                          ).exec();
                          const group = await Group.findById(
                            notification.group_id
                          ).exec();
                          data = {
                            _id: notification._id,
                            sender_id: notification.sender_id,
                            senderName: sender.username,
                            img: sender.profile_picture,
                            content_id: notification.content_id,
                            content: notification.content,
                            reponse: reponse,
                            group_id: group._id,
                            group_cover: group.cover,
                            group_name: group.name,
                            read: false,
                            createAt: notification.created_at,
                          };
                        } else{
                          const sender = await User.findById(
                            notification.sender_id
                          ).exec();
                          data = {
                            _id: notification._id,
                            sender_id: notification.sender_id,
                            senderName: sender.username,
                            img: sender.profile_picture,
                            content_id: notification.content_id,
                            content: notification.content,
                            reponse: reponse,
                            group_id: group_id,
                            read: false,
                            createAt: notification.created_at,
                          };
                        }
                      
                        if (sendUserSocket) {
                          console.log("da gui cho " + sendUserSocket);
                          socket
                            .to(sendUserSocket)
                            .emit("getNotification", data);
                        }
                      })
                      .catch((error) => {
                        console.error("Lỗi khi tạo thông báo:", error);
                      });
                  }
                });
              }
            })
            .catch((error) => {
              console.error(
                "Lỗi trong quá trình thực hiện tìm notification:",
                error
              );
            });
        }
      }
    );
  });
});


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
