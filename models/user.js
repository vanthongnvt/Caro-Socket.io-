var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
	id:{
		type: String,
		unique: true,
		required: true
	}
	name: {
		type: String,
		required: true
	}
	email: String,

	point: {
		type: Number,
		default: 0
	}
	
	created: { 
		type: Date,
		default: Date.now
	}
});

var User = mongoose.model('Book', userSchema);

module.exports = User;