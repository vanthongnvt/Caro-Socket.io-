var express = require('express');

var passport= require('passport');

var passportFB =require('passport-facebook').Strategy;

var session = require('express-session');

var bodyParser=require('body-parser');

var urlEndcodeParser=bodyParser.urlencoded({extended:true});

require('dotenv').config();

var app = express();

var mongoose=require('mongoose');

var db=mongoose.connect(process.env.DB_URL,{ useNewUrlParser: true,useCreateIndex: true }, function (err) {

});

// const MongoClient = require(‘mongodb’).MongoClient;

// const uri = process.env.DB_URL;
// const client = new MongoClient(uri, { useNewUrlParser: true });
// client.connect(err => {
//   const collection = client.db("test").collection("devices");
//   perform actions on the collection object
//   client.close();
// });


var userModel=require('./models/user');

var matchModel=require('./models/match');



app.use(express.static("public"));
app.use(express.json());

app.use(session({
	secret:'ldisfs',
	resave: true,
	saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

app.set("view engine","ejs");
app.set("views","./views");

var server=require("http").createServer(app);

server.listen(process.env.PORT);

var io = require('socket.io')(server);

// var fs=require('fs');

function midAuth(req, res, next) {
	next();
	// if(req.isAuthenticated()){
	// 	next();
	// }
	// else{
	// 	res.redirect('/login');
	// }
}

//listen connection
io.on("connection",function(socket){

	console.log(socket.id + " connected");

	socket.on("disconnect",function(){



		console.log(socket.id + " disconnected, isplay:" + socket.play);

		if(socket.play){
			socket.broadcast.to(socket.roomId).emit('You-win');
		}

		//set playfirst=true for other socket

		var playerinRoom =io.sockets.adapter.rooms[socket.roomId];

		if(typeof playerinRoom !== 'undefined'){

			for(var id in playerinRoom.sockets){
				var s = io.sockets.connected[id];

				s.playfirst = true;
				s.ready=false;
				s.play=false;
			}

			socket.broadcast.to(socket.roomId).emit('Opponent-leave-room');
		}
		
	});


	socket.on('Create-room',function(room_id){

		var room =io.sockets.adapter.rooms[room_id];

		if(typeof room !=='undefined'){
			socket.emit('Create-room-fail');
		}
		else{
			socket.emit('Create-room-success',data);
		}

	});

	socket.on('Join-room',function(room_id){

		var playerinRoom =io.sockets.adapter.rooms[room_id];

		if(typeof playerinRoom !=='undefined'){

			if(playerinRoom.length===2){
				socket.emit('Room-is-full');
			}
			else{
				socket.emit('Join-room-success');
			}
		}
		else{
			socket.emit('Room-not-exist');
		}
	})

	socket.on('User-join-room',function(){

		socket.join('Caro');
		socket.roomId='Caro';

		socket.ready=false;
		socket.play=false;


		var playerinRoom =io.sockets.adapter.rooms[socket.roomId];

		if(playerinRoom.length === 3){

			socket.leave('Caro');

			socket.emit('Room-is-full');
		}
		else{

			if(playerinRoom.length === 1){

				socket.playfirst=true;

				socket.emit('Init-player',{wait:true,username:'player1'});
			}
			else{

				socket.playfirst=false;

				socket.emit('Init-player',{wait:false, username:'player2', opponent: 'player1'});

				socket.broadcast.to(socket.roomId).emit('Opponent-join',{opponent:'player2'});

				io.to(socket.roomId).emit('Game-ready');


			}		
		}
		// socket.point=10;
	});

	socket.on('User-ready',function(){

		if(socket.play===true) return;

		socket.ready=true;

		socket.broadcast.to(socket.roomId).emit('Opponent-ready');

		//if both ready
		var playerinRoom =io.sockets.adapter.rooms[socket.roomId];

		for(var id in playerinRoom.sockets){

			if(id!==socket.id){
				var s = io.sockets.connected[id];

				if(s.ready===true){
					if(socket.playfirst===true){
						socket.emit('Game-start',true);
						s.emit('Game-start',false);
					}
					else{
						socket.emit('Game-start',false);
						s.emit('Game-start',true);
					}

					// io.to(socket.roomId).emit('Game-start');

					s.play=true;

					socket.play=true;
				}
			}
		}

		//io.to(socket.roomId).emit('Game-start');
	})

	socket.on("Client-send-mgs",function(msg){
		socket.broadcast.to(socket.roomId).emit('Server-send-msg',msg);
	});

	socket.on('User-win',function(data){

		var playerinRoom =io.sockets.adapter.rooms[socket.roomId];

		for(var id in playerinRoom.sockets){

			var s = io.sockets.connected[id];
			s.play=false;
			s.ready=false;
			s.playfirst=false;
		}

		socket.playfirst=true;


		socket.broadcast.to(socket.roomId).emit('You-lose',data);

		io.to(socket.roomId).emit('Game-end',true);
	});

	socket.on('Change-turn',function(data){
		socket.broadcast.to(socket.roomId).emit('Your-turn',data);
	});

	socket.on('No-cell-left',function(){

		//false is draw
		io.to(socket.roomId).emit('Game-end',false);

		var playerinRoom =io.sockets.adapter.rooms[socket.roomId];

		for(var id in playerinRoom.sockets){

			var s = io.sockets.connected[id];
			s.play=false;
			s.ready=false;
		}
	})

});

app.get('/',midAuth,function(req,res){

	// res.redirect('/login');

	res.render('home');
});

app.get('/play',midAuth,function(req,res){
	res.render("play",{
		user:req.user,
	});

});

app.get('/login',function(req,res){
	res.render('login');
});

app.get('/fb-login',passport.authenticate('facebook',{scope:['email']}));

app.get('/auth/fb',passport.authenticate('facebook',{
	failureRedirect:'/login',
	successRedirect:'/'
}));


passport.use('facebook',new passportFB({
	clientID:process.env.FACEBOOK_CLIENT_ID,
	clientSecret:process.env.FACEBOOK_CLIENT_SECRET,
	callbackURL: process.env.APP_URL + "/auth/fb",
	profileFields:['email','displayName','avatar']
},function(accessToken, refreshToken, profile, done){
	var get_profile=profile._json;

	userModel.findOne({id:get_profile.id},function(err,user){
		if(err) return done(err);
		if(user) {
			done(null,user);
		}

		var newUser= new userModel({
			id:get_profile.id,
			name:get_profile.name,
			email:get_profile.email,
			avatar:get_profile.avatar,
			point:500
		});

		newUser.save(function(err){
			return done(null,newUser);
		});
	})
}));

passport.serializeUser(function(user,done){
	done(null,user.id);
});

passport.deserializeUser(function(id,done){
	//get user
	userModel.findOne({id:id},function(err,user){
		done(null,user);
	})
})
