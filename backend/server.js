const dotenv = require("dotenv"); 
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();
const app = express();

app.use(cors({ origin: ["http://localhost:3000", "http://localhost:5173"], credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

app.use("/api/profile", require("./routes/profile"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/posts", require("./routes/posts"));
app.use("/api/user", require("./routes/user"));
app.use("/api/chat", require("./routes/chat"));
app.use("/api/status", require("./routes/status"));
app.use("/api/ai", require("./routes/ai"));
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("socketio", io);

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("joinRoom", (userId) => {
    if (!userId) return;
    socket.join(userId);
  });

  socket.on("sendMessage", (message) => {
    if (!message.receiver) return;
    io.to(message.receiver).emit("newMessage", message);
  });

  socket.on("markAsRead", async (msgId) => {
    const Message = require("./models/Message");
    try {
      const msg = await Message.findByIdAndUpdate(msgId, { isRead: true }, { new: true });
      if (msg?.sender) {
        io.to(msg.sender.toString()).emit("messageSeen", msg._id);
      }
    } catch (err) {
      console.log("Read error:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));