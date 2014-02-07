define([
	'rql/js-array',
	'dojo/_base/declare',
	'./Memory'
], function (arrayEngine, declare, Memory) {
	return declare([Memory], {
		// summary:
		// 		This is a mixin or base class that allows us to use RQL for querying/filtering for client stores

		filter: function (q, options) {
			// strip the leading '?' since rql doesn't like it
			if (typeof q === 'string') {
				q = q.replace(/^\?/, '');
				// the RQL engine doesn't understand our sort, start, and count properties,
				// so we apply those constraints after running the RQL query
				var subCollection = this._createSubCollection({
					filtered: (this.filtered || []).concat(q)
				});
				this._addQueryer(subCollection, arrayEngine.query(q, options));
				var data = subCollection.data = subCollection.queryer(this.data);
				subCollection.total = data.length;
				return subCollection;
			}
			return this.inherited(arguments);
		}
	});
});