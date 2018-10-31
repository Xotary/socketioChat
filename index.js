
var port = process.env.PORT || 3005,
    express = require("express"),
    app = express(),
    server = require('http').Server(app),
    io = require("socket.io")(server),
    users = {}, socks = {};
var path = require('path');
var mongo = require('mongoose');

mongo.connect('mongodb://localhost/chat', function (err) {
    if (err) {
        console.log(err);
    } else {
        console.log('connected to mongodb');
    }
});

var chatSchema = mongo.Schema({
    sendingUserName: String,
    receivingUserName: String,
    message: String,
    timeMsg: { type: Date, default: Date.now }
});

var chatModel = mongo.model('Message', chatSchema);

server.listen(port, function () {
    //if (err) throw err
    console.log('listening on *: ' + port);
});

app.use(express.static(path.join(__dirname, 'public')));

var numUsers = 0;

io.on('connection', function (socket) {

    var query = chatModel.find({ receivingUserName: 'all' });
    query.sort('-timeMsg').limit(200).exec(function (err, docs) {
        if (err) throw err;
        socket.emit('send history', docs);
    });

    socket.on("retrive history", function () {
        var query = chatModel.find({ receivingUserName: 'all' });
        query.sort('-timeMsg').limit(200).exec(function (err, docs) {
            if (err) throw err;
            socket.emit('send history', docs);
        });
    });

    socket.on("retrive private history", function (to, from) {
        var query = chatModel.find({ receivingUserName: { $in: [to, from] }, sendingUserName: { $in: [to, from] } });
        query.sort('-timeMsg').limit(200).exec(function (err, docs) {
            if (err) throw err;
            socket.emit('send history', docs);
        });
    })

    socket.on("join", function (username) {

        socket.username = username;
        users[socket.username] = { 'socket': socket };

        socket.emit('connected', 'SERVER', 'you have connected at ', getCurrentDate());
        socket.broadcast.emit('connected', 'SERVER', username + ' has connected at ', getCurrentDate());
        io.sockets.emit('updateusers', Object.keys(users));

    });

    socket.on('send message', function (msg, to, from) {
        if (!to) {
            var globalMsg = new chatModel({ message: msg, sendingUserName: from, receivingUserName: "all" });
            globalMsg.save(function (err) {
                if (err) throw err;
            });
            io.sockets.emit('update messages', globalMsg);
        } else {
            var dirMsg = new chatModel({ message: msg, sendingUserName: from, receivingUserName: to });
            dirMsg.save(function (err) {
                if (err) throw err;
            });
            socket.emit('self update message', dirMsg);
            socket.broadcast.to(users[to].socket.id).emit('update direct message', dirMsg);
        }
    });

    socket.on('send direct message', function (userName, msg, from) {
        socket.emit('sefl update message', msg);
        socket.broadcast.to(users[userName].socket.id).emit('update direct chat', msg, from);
    });

    //реализовать, если понадобиться 
    /* socket.on('user_typing', function (username) {
        var id = users[username].socket.id;
        io.sockets.connected[id].emit('chat', JSON.stringify({ 'action': 'user_typing', 'data': users[socket.user] }));
    }); */


    socket.on('disconnect', function () {
        // remove the username from global users list
        delete users[socket.username];
        io.sockets.emit('updateusers', Object.keys(users));
        socket.broadcast.emit('disconnected', 'SERVER', socket.username + ' has disconnected at', getCurrentDate());
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

