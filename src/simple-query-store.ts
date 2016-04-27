import Store from './store';

function makeGetter(property: any, queryAccessors: any) {
	if (property.indexOf('.') > -1) {
		let propertyPath = property.split('.');
		let pathLength = propertyPath.length;
		return function(object: any) {
			for (let i = 0; i < pathLength; i++) {
				object = object && (queryAccessors && object.get ? object.get(propertyPath[i]) : object[propertyPath[i]]);
			}
			return object;
		};
	}
	// else
	return function(object: any) {
		return object.get ? object.get(property) : object[property];
	};
}
const comparators = {
	eq: function <T>(value: T, required: any) {
		return value === required;
	},
	'in': function <T>(value: T, required: { data: T[] } | T[]) {
		// allow for a collection of data
		return ((<{ data: T[] }>required).data || <T[]>required).indexOf(value) > -1;
	},
	ne: function <T>(value: T, required: any) {
		return value !== required;
	},
	lt: function <T>(value: T, required: any) {
		return value < required;
	},
	lte: function <T>(value: T, required: any) {
		return value <= required;
	},
	gt: function <T>(value: T, required: any) {
		return value > required;
	},
	gte: function <T>(value: T, required: any) {
		return value >= required;
	},
	match: function(value: string, required: RegExp) {
		return required.test(value);
	},
	contains: function(value: any, required: any, object?: any, key?: string) {
		let collection = this;
		return (required.data || required).every(function(requiredValue: any) {
			if (typeof requiredValue === 'object' && requiredValue.type) {
				let comparator = collection._getFilterComparator(requiredValue.type);
				return (<any[]>value).some(function(item) {
					return comparator.call(collection, item, requiredValue.args[1], object, key);
				});
			}
			return value.indexOf(requiredValue) > -1;
		});
	}
};

export default class SimpleQueryStore extends Store {
	private _createFilterQuerier(filter: any) {
		// create our matching filter function
		let queryAccessors = this.queryAccessors;
		let collection = this;
		let querier = getQuerier(filter);

		function getQuerier(filter?: any) {
			let querier: any;
			let type = filter.type;
			let args = filter.args;
			let comparator = collection._getFilterComparator(type);
			if (comparator) {
				// it is a comparator
				let firstArg = args[0];
				let getProperty = makeGetter(firstArg, queryAccessors);
				let secondArg = args[1];
				if (secondArg && secondArg.fetchSync) {
					// if it is a collection, fetch the contents (for `in` and `contains` operators)
					secondArg = secondArg.fetchSync();
				}
				return function(object: any) {
					// get the value for the property and compare to expected value
					return comparator.call(collection, getProperty(object), secondArg, object, firstArg);
				};
			}
			switch (type) {
				case 'and': case 'or':
					for (let i = 0, l = args.length; i < l; i++) {
						// combine filters, using and or or
						let nextQuerier = getQuerier(args[i]);
						if (querier) {
							// combine the last querier with a new one
							querier = (function(a: any, b: any) {
								return type === 'and' ?
									function(object: any) {
										return a(object) && b(object);
									} :
									function(object: any) {
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
					let filterFunction = (<any>collection)[args[0]];
					if (!filterFunction) {
						throw new Error('No filter function ' + args[0] + ' was found in the collection');
					}
					return filterFunction;
				case undefined:
					return function() {
						return true;
					};
				default:
					throw new Error('Unknown filter operation "' + type + '"');
			}
		}
		return function(data: any[]) {
			return data.filter(querier);
		};
	}

	private _getFilterComparator(type: any) {
		// summary:
		//		Get the comparator for the specified type
		// returns: Function?

		return (<any>comparators)[type];
	}

	private _createSelectQuerier(properties: string | string[]) {
		return function(data: any[]) {
			let l = properties.length;
			return data.map(properties instanceof Array ?
				// array of properties
				function(object: any) {
					let selectedObject = {};
					for (let i = 0; i < l; i++) {
						let property = properties[i];
						(<any>selectedObject)[property] = object[property];
					}
					return selectedObject;
				} :
				// single property
				function(object: any) {
					return object[properties];
				});
		};
	}

	private _createSortQuerier(sorted: any) {
		let queryAccessors = this.queryAccessors;
		return function(data: any) {
			data = data.slice();
			data.sort(typeof sorted == 'function' ? sorted : function(a: any, b: any) {
				for (let i = 0; i < sorted.length; i++) {
					let comparison: any;
					let sorter = sorted[i];
					if (typeof sorter == 'function') {
						comparison = sorter(a, b);
					} else {
						let getProperty = sorter.get || (sorter.get = makeGetter(sorter.property, queryAccessors));
						let descending = sorter.descending;
						let aValue = getProperty(a);
						let bValue = getProperty(b);

						aValue != null && (aValue = aValue.valueOf());
						bValue != null && (bValue = bValue.valueOf());
						if (aValue === bValue) {
							comparison = 0;
						}
						else {
							// Prioritize undefined > null > defined
							let isALessThanB = typeof bValue === 'undefined' ||
								bValue === null && typeof aValue !== 'undefined' ||
								aValue != null && aValue < bValue;
							comparison = Boolean(descending) === isALessThanB ? 1 : -1;
						}
					}

					if (comparison !== 0) {
						return comparison;
					}
				}
				return 0;
			});
			return data;
		};
	}
}