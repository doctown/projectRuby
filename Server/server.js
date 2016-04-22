var bodyParser = require('body-parser');
var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

console.log('Sapphire is listening in on 4568');
server.listen(4568);

app.use(bodyParser.json());

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.get('/socket.io-client/socket.io.js', function(req, res) {
  res.sendFile(__dirname + '/socket.io-client/socket.io.js');
});

app.get('/scripts/userLocation.js', function(req, res) {
  res.sendFile(__dirname + '/scripts/userLocation.js');
});

app.get('/scripts/userMarker.js', function(req, res) {
  res.sendFile(__dirname + '/scripts/userMarker.js');
});

app.get('/scripts/map.js', function(req, res) {
  res.sendFile(__dirname + '/scripts/map.js');
});

app.get('/scripts/directions.js', function(req, res) {
  res.sendFile(__dirname + '/scripts/directions.js');
});

app.get('/map', function(req, res) {
  res.sendFile(__dirname + '/map.html');
});

app.post('/connect',
  function(req, res) {
    console.log(req.body);
    res.status(200).send('I think it worked');
  });

var sockets = {};

io.on('connection', function(socket) {
  socket.friends = [];

  socket.on('chat message', (msg) => {
    console.log('Something Happened!', msg);
    io.emit('chat message', msg);
  });

  /*
   * Receives a notification and sends it to the recipient.
   * @params: notification.message - message to be communicated
   *          notification.senderID - id of the sender
   *          notification.recipientID - id of the person to be notified
   */
  socket.on('notification', (notification) => {
    sockets[notification.recipientID].emit('notification', notification);
  });

  socket.on('registerID', (id) => {
    socket.id = id;
    sockets[id] = socket;
  });

  socket.on('registerFriends', (friends) => {
    socket.friends = friends || [];
  });

  /*
   * On each change of location from the client, the server is notified. In response it
   * sends an update of this user's location to all friends so they can change their location
   * on their maps.
   * @params: loc.latitude - new user latitude
   *          loc.longitude - new user longitude
   */
  socket.on('change location', (loc) => {
    for (var i = 0; i < socket.friends.length; i++) {
      var friendSocket = sockets[socket.friends[i]];
      if (friendSocket) {
        friendSocket.emit('change location', {id: socket.id, loc: loc});
      }
    }
  });

  socket.on('set destination', (loc) => {
    for (var i = 0; i < socket.friends.length; i++) {
      var friendSocket = sockets[socket.friends[i]];
      if (friendSocket) {
        friendSocket.emit('set destination', {id: socket.id, loc: loc});
      }
    }
  });

  socket.on('remove destination', () => {
    for (var i = 0; i < socket.friends.length; i++) {
      var friendSocket = sockets[socket.friends[i]];
      if (friendSocket) {
        friendSocket.emit('remove destination', socket.id);
      }
    }
  });

  socket.on('found location', (loc) => {
    console.log('This is another location: ', loc);
    io.emit('found location', loc);
  });

  socket.on('disconnect', () => {
    for (var i = 0; i < socket.friends.length; i++) {
      var friendSocket = sockets[socket.friends[i]];
      if (friendSocket) {
        friendSocket.emit('logoff', socket.id);
      }
    }

    sockets[socket.id] = undefined;
    console.log('A user has disconnected');
  });

  console.log('a user has connected');
});
