define([
	'rql/query',
	'rql/js-array',
//	'./util/SimpleQueryEngine'
], function (rql, arrayEngine, SimpleQueryEngine) {
	return function (store) {
		// to use rql we need to adjust the query on the store...
		var originalQuery = store.query,
			queryEngine;
		store.query = function (query, options) {
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
			// it is our responsibility to prepend '?' (and coerce the query to a string)
			return originalQuery.call(this, '?' + q, options);
		};

		// ...and set the query engine to something that will work
		queryEngine = store.queryEngine = function (q, options) {
			// strip the leading '?' since rql doesn't like it
			q = q.replace(/^\?/, '');
			// the RQL engine doesn't understand our sort, start, and count properties,
			// so we apply those constraints after running the RQL query
			var postQuery = SimpleQueryEngine({}, options);
			function query(target) {
				return postQuery(arrayEngine.query(q, options, target));
			}
			// TODO: is there an efficient matches function
			//query.matches = function (it) { ... }

			return query;
		};
		return store;
	};
});