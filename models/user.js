var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
	id:{
		type: String,
		unique: true,
		required: true
	},
	name: {
		type: String,
		required: true
	},
	email: String,

	avatar: {
		type: String,
		required: true
	},

	point: {
		type: Number,
		default: 0
	},

	matches_win: {
		type: Number,
		default: 0
	},

	matches_lose: {
		type: Number,
		default:0
	},
	matches_draw: {
		type: Number,
		default: 0
	},
	last_socket:{
		type: String,
		default: null
	},
	created: { 
		type: Date,
		default: Date.now
	}
});

userSchema.methods.updateWhenLose = function (bet_point){

	var update_point=parseInt(this.point) - parseInt(bet_point);
	if(update_point<0){
		update_point=0;
	}
	this.constructor.updateOne({_id:this._id},{
		point:update_point,
		matches_lose: this.matches_lose + 1
	},function(err,result){
		return result;
	});
}
userSchema.methods.updateWhenWin = function (bet_point){
	this.constructor.updateOne({_id:this._id},{
		point:this.point + parseInt(bet_point),
		matches_win: this.matches_win + 1
	},function(err,result){
		return result;
	});
}

userSchema.methods.updateWhenDraw = function (bet_point){

	this.constructor.updateOne({_id:this._id},{
		matches_draw: this.matches_draw + 1
	},function(err,result){
		return result;
	});
}


var User = mongoose.model('User', userSchema);

module.exports = User;