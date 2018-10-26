/* var express = require('express');
var app = express();

var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3002;
 */
var port = process.env.PORT || 3005,
    express = require("express"),
    app = express(),
    server = require('http').Server(app),
    io = require("socket.io")(server),
    users = {}, socks = {};
    var path = require('path');
var users = {};


server.listen(port, function () {
    //if (err) throw err
    console.log('listening on *: ' + port);
});

/* app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html')
}); */
app.use(express.static(path.join(__dirname, 'public')));

var numUsers = 0;

io.on('connection', function (socket) {
    
    socket.on("join", function (username) {
       
        socket.username = username;
        users[socket.username] = socket;
        
        socket.emit('update messages', 'SERVER', 'you have connected');
        socket.broadcast.emit('update messages', 'SERVER', username + ' has connected');
        io.sockets.emit('updateusers', Object.keys(users));
 
    });

    socket.on('sendchat', function (data) {
		// we tell the client to execute 'updatechat' with 2 parameters
		io.sockets.emit('update messages', socket.username, data);
	});

    socket.on('user_typing', function (recv) {
		var id = socks[recv.user].socket.id;
        io.sockets.connected[id].emit('chat', JSON.stringify({'action': 'user_typing', 'data': users[socket.user]}));
    });
    
    socket.on('message', function (recv, fn) {
		var d = new Date();
		var id = socks[recv.user].socket.id;
		var msg = {'msg': recv.msg, 'user': users[socket.user]};
		if (typeof fn !== 'undefined')
			fn(JSON.stringify( {'ack': 'true', 'date': d} ));
		io.sockets.connected[id].emit('chat', JSON.stringify( {'action': 'message', 'data': msg, 'date': d} ));
	});
    
    socket.on('say to someone', function(id, msg){
        socket.broadcast.to(id).emit('my message', msg);
      });

    socket.on('disconnect', function(){
		// remove the username from global users list
		delete users[socket.username];
		// update list of users in chat, client-side
		io.sockets.emit('updateusers', Object.keys(users));
		// echo globally that this client has left
		socket.broadcast.emit('update messages', 'SERVER', socket.username + ' has disconnected');
	});
});

function getCurrentDate() {
    var currentDate = new Date();
    var day = (currentDate.getDate() < 10 ? '0' : '') + currentDate.getDate();
    var month = ((currentDate.getMonth() + 1) < 10 ? '0' : '') + (currentDate.getMonth() + 1);
    var year = currentDate.getFullYear();
    var hour = (currentDate.getHours() < 10 ? '0' : '') + currentDate.getHours();
    var minute = (currentDate.getMinutes() < 10 ? '0' : '') + currentDate.getMinutes();
    var second = (currentDate.getSeconds() < 10 ? '0' : '') + currentDate.getSeconds();
    return year + "-" + month + "-" + day + " " + hour + ":" + minute + ":" + second;
}

