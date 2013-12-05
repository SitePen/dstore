define([
	'dojo/Deferred'
], function(Deferred){
	// A mock request handler for testing.
	return function(url, options){
		var dfd = new Deferred();
		dfd.resolve(JSON.stringify({
			headers: options.headers
		}));
		return dfd;
	};
});
