const app = require("express")();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const uuid = require("uuid/v5");
const _ = require("lodash");

class User {
  constructor({ socket, interests = ["general"] }) {
    this.id = uuid();
    this.socket = socket;
    this.interests = interests.includes("general")
      ? interests
      : ["general", ...interests];
    this.alreadyTalkedTo = [];
  }
}

const users = [];

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

http.listen(3000, () => {
  console.log("listening on *:3000");
});

const handleSocketConnection = socket => {
  const user = new User({ socket });
  console.log(`User connected and assigned id "${user.id}"`);
  users.push(user);

  socket.on("disconnect", reason => {
    handleSocketDisconnect(user, reason);
  });

  socket.on("new-message", message => {
    handleNewMessageReceived(user, message);
  });

  socket.on("get-next-partner", () => {
    handleGetNextPartner(user);
  });
};

const handleGetNextPartner = user => {
  const otherUsers = users.filter(u => u.id !== user.id);
  const notTalkedTo = otherUsers.filter(
    u => !user.alreadyTalkedTo.includes(u.id)
  );

  //
  if (notTalkedTo.length === 0) {
    // TODO
    console.log(
      "No other people in channel. Waiting for someone to connect..."
    );
    return;
  }

  const { id: randomPartnerId } = _.sample(notTalkedTo);

  user.socket.emit("next-partner-id", randomPartnerId);
};

const handleSocketDisconnect = (user, reason) => {
  console.log(`User with id "${user.id}" disconnected`);

  users = users.filter(u => u.id !== user.id);
};

const handleNewMessageReceived = (user, message) => {
  user.socket.broadcast.emit("message", { message, createdAt: Date.now() });
};

io.on("connection", handleSocketConnection);
