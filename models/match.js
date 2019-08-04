var mongoose = require('mongoose');

var matchSchema = mongoose.Schema({
	winer_id:{
		type: String,
		unique: true,
		required: true
	},
	loser_id: {
		type: String,
		required: true
	},
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