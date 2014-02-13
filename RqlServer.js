define([
	'rql/query',
	'dojo/_base/declare'
], function (rql, declare) {
	return declare(null, {
		// summary:
		// 		This is a mixin or base class that allows us to use RQL for querying/filtering
		filter: function (query, options) {
			var q = [],
				prop;

			if (typeof query === 'object') {
				for (prop in query) {
					if (query.hasOwnProperty(prop)) {
						q.push(prop + '=' + query[prop]);
					}
				}
				q = q.join('&');
			}
			else {
				// assume it's a string
				q = query;
			}

			q = new rql.Query(q);
			// it is not our responsibility to prepend '?' (but we should coerce the query to a string)
			return this.inherited(arguments, ['' + q, options]);
		}
	});
});