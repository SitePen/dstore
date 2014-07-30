define([
	'dojo/_base/array'
], function (arrayUtil) {

	// module:
	//		dstore/objectQueryEngine

	return {
		_combine: function(args, type) {
			var querier;
			for (var i = 0, l = args.length; i < l; i++) {
				var nextQuerier = this.filter(args[0]);
				if (querier) {
					// combine the last querier with a new one
					querier = (function(a, b) {
						return type === 'and' ?
							function(object) {
								return a(object) && b(object);
							} :
							function(object) {
								return a(object) || b(object);
							};
					})(querier, nextQuerier);
				} else {
					querier = nextQuerier;
				}
			}
			return querier;
		},
		comparators: {
			eq: function (value, required) {
				return value === required;
			},
			'in': function(value, required) {
				return arrayUtil.indexOf(required, value) > -1;
			},
			ne: function (value, required) {
				return value !== required;
			},
			lt: function (value, required) {
				return value < required;
			},
			lte: function (value, required) {
				return value <= required;
			},
			gt: function (value, required) {
				return value > required;
			},
			gte: function (value, required) {
				return value >= required;
			},
			match: function (value, required, object) {
				return required.test(value, object);
			}
		},
		filter: function (filter) {
			// create our matching filter function
			var queryAccessors = this.queryAccessors;
			var comparators = (this.queryEngine || this).comparators || {};
			var querier = getQuerier(filter);

			function getQuerier(filter) {
				var type = filter.type;
				var args = filter.args;
				var comparator = comparators[type];
				if (comparator) {
					// it is a comparator
					var firstArg = args[0];
					var secondArg = args[1];
					return function (object) {
						// get the value for the property and compare to expected value
						return comparator(queryAccessors && object.get ? object.get(firstArg) : object[firstArg], secondArg, object);
					};
				}
				switch (type) {
					case 'and': case 'or':
						for (var i = 0, l = args.length; i < l; i++) {
							// combine filters, using and or or
							var nextQuerier = getQuerier(args[i]);
							if (querier) {
								// combine the last querier with a new one
								querier = (function(a, b) {
									return type === 'and' ?
										function(object) {
											return a(object) && b(object);
										} :
										function(object) {
											return a(object) || b(object);
										};
								})(querier, nextQuerier);
							} else {
								querier = nextQuerier;
							}
						}
						return querier;
					case 'function':
						return args[0];
					case 'string':
						// named filter
						if (!this[args[0]]) {
							throw new Error('No filter function ' + filter + ' was found in store');
						}
						return this[filter];
					case undefined:
						return function () {
							return true;
						};
					default:
						throw new Error('Unknown filter operation "' + type + '"');
				}
			}
			return function (data) {
				return arrayUtil.filter(data, querier);
			};
		},

		map: function (query) {
			return function (data) {
				return arrayUtil.map(data, query);
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
							var aValue = a.get ? a.get(property) : a[property];
							var bValue = b.get ? b.get(property) : b[property];

							aValue != null && (aValue = aValue.valueOf());
							bValue != null && (bValue = bValue.valueOf());

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
				return data.slice(range.start, range.end);
			};
		}
	};
});
