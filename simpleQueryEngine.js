define([
	'dojo/_base/array'
], function (arrayUtil) {

	// module:
	//		dstore/simpleQueryEngine

	return {
		filter: function (query) {
			// create our matching query function
			var queryer = query;
			switch (typeof query) {
				default:
					throw new Error('Can not query with a ' + typeof query);
				case 'object':
				case 'undefined':
					var queryObject = query;
					queryer = function (object) {
						for (var key in queryObject) {
							var required = queryObject[key];
							if (required && required.test) {
								// an object can provide a test method, which makes it work with regex
								if (!required.test(object[key], object)) {
									return false;
								}
							} else if (required !== object[key]) {
								return false;
							}
						}
						return true;
					};
					break;
				case 'string':
					// named query
					if (!this[query]) {
						throw new Error('No filter function ' + query + ' was found in store');
					}
					queryer = this[query];
					/* falls through */
				case 'function':
					/* falls through */
			}

			return function (data) {
				return arrayUtil.filter(data, queryer);
			};
		},

		/* jshint ignore:start */
		sort: function (sorted) {
			return function (data) {
				data = data.slice();
				data.sort(typeof sorted == 'function' ? sorted : function (a, b) {
					for (var i = 0; i < sorted.length; i++) {
						var comparison;
						if (typeof sorted[i] == 'function') {
							comparison = sorted[i](a, b);
						} else {
							var property = sorted[i].property;
							var descending = sorted[i].descending;
							var aValue = a[property];
							var bValue = b[property];

							comparison = aValue === bValue
								? 0
								: (!!descending === (aValue === null || aValue > bValue) ? -1 : 1);
						}

						if (comparison !== 0) {
							return comparison;
						}
					}
					return 0;
				});
				return data;
			};
		},
		/* jshint ignore:end */

		range: function (range) {
			return function (data) {
				return data.slice(range.start, range.end || Infinity);
			};
		}
	};
});
