define([
	'dojo/_base/declare',
	'dojo/_base/lang',
	'rql/js-array',
	'./simpleQueryEngine',
	'./Memory'
], function (declare, lang, arrayEngine, simpleQueryEngine, Memory) {
	return declare(Memory, {
		// summary:
		// 		This is a mixin or base class that allows us to use RQL for querying/filtering for client stores

		queryEngine: lang.delegate(simpleQueryEngine, {
			// TODO: What to do about options? Currently this is not supported by QueryMethod
			filter: function (filter, options) {
				return typeof filter === 'string'
					? arrayEngine.query(filter, options)
					: simpleQueryEngine.filter(filter, options);
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
