var express = require('express');

var passport= require('passport');

var passportFB =require('passport-facebook').Strategy;

var passportSocketIo = require('passport.socketio');

var session = require('express-session');

var RedisStore = require('connect-redis')(session);

var bodyParser=require('body-parser');

var flash=require('connect-flash');

var redis=require('redis');

require('dotenv').config();

var fs=require('fs');

var mongoose=require('mongoose');

var app = express();

var db=mongoose.connect(process.env.DB_URL,{ useNewUrlParser: true,useCreateIndex: true }, function (err) {

});

var userModel=require('./models/user');

var matchModel=require('./models/match');

var client    = redis.createClient({
    port      : process.env.REDIS_PORT,               // replace with your port
    host      : process.env.REDIS_HOST,        // replace with your hostanme or IP address
    password  : process.env.REDIS_PASSWORD,    // replace with your passwor
});

var sessionStore=new RedisStore({
	client: client
})


app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.json());

app.use(session({
	store: sessionStore,
	secret: process.env.SECRET_KEY_BASE,
	resave: true,
	saveUninitialized: true
}));

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

app.set("view engine","ejs");
app.set("views","./views");

var server=require("https").createServer({
	key: fs.readFileSync('server.key','utf-8'),
	cert: fs.readFileSync('server.cert','utf-8')
},app);

server.listen(process.env.PORT);

var io = require('socket.io')(server);


function midAuth(req, res, next) {
	// next();
	if(req.isAuthenticated()){
		return next();
	}
	else{
		return res.redirect('/login');
	}
}

// function sessionMiddleware(req,res, next){

// }
// io.use(function(socket, next){
// 	session(socket.request, {}, next);
// });

io.use(passportSocketIo.authorize({
	store: sessionStore, 
	cookieParser: require('cookie-parser'),
	key: 'connect.sid',
	secret: process.env.SECRET_KEY_BASE,
	passport: passport,
}));

app.get('/create-session1',function(req,res){
	userModel.findOne({id:'1'},function(err,user){
		req.user = user;
		res.redirect('/');
	});
})

app.get('/create-session2',function(req,res){
	userModel.findOne({id:'2'},function(err,user){
		req.user = user;
		res.redirect('/');
	});
});

//listen connection
io.on("connection",function(socket){


	// console.log(socket.request.user);

	socket.on("disconnect",function(){


		var end=false;
		var splayer_win;
		// console.log(socket.id + " disconnected, isplay:" + socket.play);

		if(socket.play){
			end=true;
			socket.broadcast.to(socket.roomId).emit('You-win');
		}

		//set playfirst=true for other socket

		var playerinRoom =io.sockets.adapter.rooms[socket.roomId];

		if(typeof playerinRoom !== 'undefined'){

			for(var id in playerinRoom.sockets){
				var s = io.sockets.connected[id];
				if(id!==socket.id){
					splayer_win=s;
				}

				s.playfirst = true;
				s.ready=false;
				s.play=false;
			}

			socket.broadcast.to(socket.roomId).emit('Opponent-leave-room');

			if(end){
				var user_win=splayer_win.request.user;
				var user_lose=socket.request.user;

				match = new matchModel({
					player1_id: user_win.id,
					player2_id: user_lose.id,
					winer_id: user_win.id,
					bet_point: socket.betPoint,
				});
				match.save(function(err){});

				user_win.updateWhenWin(socket.betPoint);
				user_lose.updateWhenLose(socket.betPoint);
			}
		}
		
	});


	socket.on('Create-room',function(data){

		var room =io.sockets.adapter.rooms[data.roomid];
		var user_point=socket.request.user.point;
		var bet_point=parseInt(data.bet_point);
		if(bet_point<0){
			bet_point=0;
		}
		if(user_point < bet_point){
			socket.emit('Not-enough-point-to-create');
			return;
		}
		if(typeof room !=='undefined'){
			socket.emit('Create-room-fail');
			return;
		}
		else{
			socket.emit('Create-room-success',data.roomid);
		}

	});

	socket.on('Join-room',function(room_id){

		var playerinRoom =io.sockets.adapter.rooms[room_id];

		if(typeof playerinRoom !=='undefined'){

			if(playerinRoom.length===2){
				socket.emit('Room-is-full');
			}
			else{
				var bet_point;
				var user_point=socket.request.user.point;
				for(var id in playerinRoom.sockets){
					sfirst=io.sockets.connected[id];
					bet_point=sfirst.bet_point;
					if(bet_point > user_point){
						socket.emit('Not-enough-point-to-join');
						return;
					}
				}
				socket.emit('Join-room-success',bet_point);
			}
		}
		else{
			socket.emit('Room-not-exist');
		}
	})

	socket.on('User-join-room',function(room){

		var user= socket.request.user;

		var last_socketid=user.last_socket;
		if(last_socketid!==null){
			var slast = io.sockets.connected[last_socketid];
			if(typeof slast!=='undefined'){
				slast.emit('Force-disconnect');
			}
		}


		socket.join(room.roomid);
		socket.roomId=room.roomid;

		socket.ready=false;
		socket.play=false;


		var playerinRoom =io.sockets.adapter.rooms[room.roomid];

		if(playerinRoom.length === 3){

			socket.leave('Caro');

			socket.emit('Room-is-full');
		}
		else{

			user.last_socket=socket.id;
			userModel.updateOne({id:user.id},{last_socket:socket.id},function(err,result){});

			socket.betPoint=room.bet_point;

			//first player
			if(playerinRoom.length === 1){


				socket.playfirst=true;

				socket.emit('Init-player',{wait:true, point: socket.request.user.point});
			}

			//second player
			else{

				socket.playfirst=false;

				for(var id in playerinRoom.sockets){

					if(id!==socket.id){
						var sfirst = io.sockets.connected[id];
						socket.emit('Init-player',{wait:false, point: socket.request.user.point ,opponent: sfirst.request.user,roomInf:{
							id:sfirst.roomId,
							bet_point:sfirst.betPoint
						}});
						break;
					}
				}

				socket.broadcast.to(socket.roomId).emit('Opponent-join',{opponent:socket.request.user});

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
		var splayer_lose;
		for(var id in playerinRoom.sockets){
			var s = io.sockets.connected[id];
			if(id!==socket.id){
				splayer_lose=s;
			}
			s.play=false;
			s.ready=false;
			s.playfirst=false;
		}

		socket.playfirst=true;


		socket.broadcast.to(socket.roomId).emit('You-lose',data);

		io.to(socket.roomId).emit('Game-end',true);

		var user_win=socket.request.user;
		var user_lose=splayer_lose.request.user;

		match = new matchModel({
			player1_id: user_win.id,
			player2_id: user_lose.id,
			winer_id: user_win.id,
			bet_point: socket.betPoint,
		});
		match.save(function(err){});
		
		user_win.updateWhenWin(socket.betPoint);
		user_lose.updateWhenLose(socket.betPoint);

	});

	socket.on('Change-turn',function(data){
		socket.broadcast.to(socket.roomId).emit('Your-turn',data);
	});

	socket.on('No-cell-left',function(){

		//false is draw
		io.to(socket.roomId).emit('Game-end',false);

		var playerinRoom =io.sockets.adapter.rooms[socket.roomId];
		var splayer2;

		for(var id in playerinRoom.sockets){
			var s = io.sockets.connected[id];
			if(id!==socket.id){
				player2=s;
			}
			s.play=false;
			s.ready=false;
		}
		var user_1=socket.request.user;
		var user_2=splayer2.request.user;

		match = new matchModel({
			player1_id: user_1.id,
			player2_id: user_2.id,
			winer_id: null,
			bet_point: socket.betPoint,
		});
		match.save(function(err){});

		user_1.updateWhenDraw(socket.betPoint);
		user_2.updateWhenDraw(socket.betPoint);

	})

});

app.get('/',midAuth,function(req,res){
	userModel.find({},function(err,users){
		return res.render('home',{user:req.user,rank_list:users});
	})
});

app.post('/create-room',midAuth,function(req,res){

	var params=req.body;

	// console.log(params);

	var bet_point=params.bet_point===''?0:parseInt(params.bet_point);

	if(bet_point<0){
		bet_point=0;
	}
	else if(bet_point>100){
		bet_point=100;
	}

	if(bet_point>req.user.point){
		return res.redirect('/');
	}

	req.flash('room',{id:params.room_id_create,betPoint:bet_point});
	res.redirect('/play');

});

app.post('/join-room',midAuth,function(req,res){
	if(typeof req.body.bet_point === 'undefined'){
		return res.redirect('/');
	}
	if(req.body.bet_point > req.user.point){
		return res.redirect('/');
	}
	var params=req.body;

	req.flash('room',{id:params.room_id_join});
	res.redirect('/play');

});

app.get('/play',midAuth,function(req,res){

	var room=req.flash('room');
	
	if(room.length===0){
		
		return res.redirect('/');
	}
	// console.log(room[0].id);

	res.render("play",{
		roomId:room[0].id,
		betPoint:room[0].betPoint,
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
	callbackURL:"/auth/fb",
	profileFields:['email','displayName','photos']
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
			avatar:profile.photos ? profile.photos[0].value : '/img/unknown-user-pic.jpg',
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
