define([
	'dojo/_base/declare',
	'dojo/_base/lang',
	'rql/js-array',
	'./objectQueryEngine',
	'./Memory'
], function (declare, lang, arrayEngine, objectQueryEngine, Memory) {
	return declare(Memory, {
		// summary:
		// 		This is a mixin or base class that allows us to use RQL for querying/filtering for client stores

		queryEngine: lang.delegate(objectQueryEngine, {
			// TODO: What to do about options? Currently this is not supported by QueryMethod
			filter: function (filter, options) {
				return typeof filter === 'string'
					? arrayEngine.query(filter, options)
					: objectQueryEngine.filter(filter, options);
			}
		}),

		filter: function () {
			var subCollection = this.inherited(arguments),
				queryLog = subCollection.queryLog;

			var data = subCollection.data = queryLog[queryLog.length - 1].queryer(this.data);
			subCollection.total = data.length;

			return subCollection;
		}
	});
});
