define([
	'dojo/_base/declare',
	'dojo/Deferred',
	'./QueryResults'
], function (declare, Deferred, QueryResults) {
	// this is mixin that can be used to provide async methods,
	// by implementing their sync counterparts
	function promised(method, query) {
		return function() {
			var deferred = new Deferred();
			try {
				deferred.resolve(this[method].apply(this, arguments));
			} catch (error) {
				deferred.reject(error);
			}
			return query ? new QueryResults(deferred.promise) : deferred.promise;
		};
	}
	return declare(null, {
		get: promised('getSync'),
		put: promised('putSync'),
		add: promised('addSync'),
		remove: promised('removeSync'),
		fetch: promised('fetchSync', true),
		fetchRange: promised('fetchRangeSync', true),
	});
});
