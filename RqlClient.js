define([
	'rql/js-array',
	'dojo/_base/declare',
	'./SimpleQuery'
], function (arrayEngine, declare, SimpleQuery) {
	return declare([SimpleQuery], {
		// summary:
		// 		This is a mixin or base class that allows us to use RQL for querying/filtering for client stores

		filter: function (q, options) {
			// strip the leading '?' since rql doesn't like it
			if(typeof q == 'string'){
				q = q.replace(/^\?/, '');
				// the RQL engine doesn't understand our sort, start, and count properties,
				// so we apply those constraints after running the RQL query
				return this._newResults(arrayEngine.query(q, options));
			}
			return this.inherited(arguments);
		}
	});
});