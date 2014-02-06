define([
	'dojo/_base/declare',
	'dojo/has',
	'dojo/_base/lang',
	'dojo/_base/array',
	'./Store'/*=====, './api/Store' =====*/
], function (declare, has, lang, arrayUtil, Store /*=====, Store =====*/) {

	// module:
	//		dstore/Memory

	return declare(Store, {
		queryer: null,

		filter: function (query) {
			// create our matching query function
			var queryer = query;
			switch(typeof query){
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
							} else if(required != object[key]) {
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
					// fall through
				case 'function':
					// fall through
			}

			return this._addQueryer(this.inherited(arguments), function (data) {
				return arrayUtil.filter(data, queryer);
			});
		},

		sort: function (property) {
			var newCollection = this.inherited(arguments);
			return this._addQueryer(newCollection, function (data) {
				var sorted = newCollection.sorted;
				data.sort(typeof property == 'function' ? property : function (a, b) {
					for(var i = 0; i < sorted.length; i++){
						var property = sorted[i].property;
						var descending = sorted[i].descending;
						var aValue = a[property];
						var bValue = b[property];
						if (aValue != bValue) {
							return !!descending === (aValue === null || aValue > bValue) ? -1 : 1;
						}
					}
					return 0;
				});
				return data;
			});
		},

		_addQueryer: function (collection, queryer) {
			var previousQueryer = this.queryer;
			collection.queryer = previousQueryer ? function (data) {
				return queryer(previousQueryer(data, true));
			} : queryer;
			return collection;
		}

	});

});
