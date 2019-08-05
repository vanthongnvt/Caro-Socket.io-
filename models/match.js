var mongoose = require('mongoose');

var matchSchema = mongoose.Schema({
	player1_id:{
		type: String,
		unique: true,
		required: true
	},
	palyer2_id: {
		type: String,
		required: true
	},
	winer_id: String,
	
	bet_point: {
		type: Number,
		default: 0
	},
	created: { 
		type: Date,
		default: Date.now
	}
});

var Match = mongoose.model('Match', matchSchema);

module.exports = Match;