var express = require("express");
var app = express();
var http = require("http").createServer(app);
var io = require("socket.io")(http);
const { joinUser, removeUser, findUser } = require('./users');

app.use(express.static(__dirname + '/public'));

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/index.html");
});

let thisRoom = "";


io.on('connection', function (socket) {
  console.log(socket.id , 'a user connected');

  //when client emits create or join
  socket.on('create or join', function (data) {

    let Newuser = joinUser(socket.id, data.username, data.roomName)
    //io.to(Newuser.roomname).emit('send data' , {username : Newuser.username,roomname : Newuser.roomname, id : socket.id})
    // io.to(socket.id).emit('send data' , {id : socket.id ,username:Newuser.username, roomname : Newuser.roomname });
    socket.emit('send data', { id: socket.id, username: Newuser.username, roomname: Newuser.roomname });
    thisRoom = Newuser.roomname;
    socket.join(Newuser.roomname);
    console.log('create or join to room', Newuser.roomname);


    //count number of users on room
    var myRoom = io.sockets.adapter.rooms[Newuser.roomname] || { length: 0 };
    var numClients = myRoom.length;
    console.log(Newuser.roomname, ' has ', numClients, ' clients');
    if (numClients == 1) {
      socket.join(Newuser.roomname);
      socket.emit('created', Newuser.roomname);
      //socket.to(roomId).broadcast.emit('user-connected', userId);
    } else if (numClients == 2) {
      socket.join(Newuser.roomname);
      socket.emit('joined', Newuser.roomname);
    } else {
      socket.emit('full', Newuser.roomname);
    }

  });


  //Sends the chat message to the designated room where the user is located
  socket.on("chat message", (data) => {
    io.to(thisRoom).emit("chat message", { data: data, id: socket.id });
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    console.log(user);
    if (user) {
      console.log(user.username + ' has left');
    }
    console.log("disconnected");

  });


  //relay only handlers
  socket.on('ready', function (room) {
    socket.broadcast.to(room).emit('ready');
  })

  socket.on('candidate', function (event) {
    socket.broadcast.to(event.room).emit('candidate', event);
  });

  socket.on('offer', function (event) {
    socket.broadcast.to(event.room).emit('offer', event.sdp);
  });

  socket.on('answer', function (event) {
    socket.broadcast.to(event.room).emit('answer', event.sdp);
  });

});





const port = process.env.PORT || 3000;
http.listen(port, function () {
  console.log("Server listening on port 3000.");
});