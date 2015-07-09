import { Hash } from 'dojo-core/interfaces';
export interface FilterArgs {
	[ name: string ]: Filter | RegExp | string | (() => boolean);
}

export default class Filter implements Hash<any> {
	[ index: string ]: any;
	type: string;
	args: any[];

	constructor(filterArg?: string | (() => any) | FilterArgs) {
		if (typeof filterArg === 'string' || typeof filterArg === 'function') {
			this.type = typeof filterArg;
			this.args = [filterArg];
		}
		else if (filterArg) {
			let filter = this;
			// construct a filter based on the query object
			for (let key in filterArg) {
				const value = (<FilterArgs> filterArg)[key];
				if (value instanceof Filter) {
					// fully construct the filter from the single arg
					filter = filter[value.type](key, value.args[0]);
				}
				else if (value && typeof (<any> value).test === 'function') {
					// support regex and functions
					filter = filter.match(key, value);
				}
				else {
					filter = filter.eq(key, value);
				}
			}
			this.type = filter.type;
			this.args = filter.args;
		}
	}

	protected _createFilter(key: any, target: any, type: string) {
		const filter = new Filter();
		filter.type = type;
		filter.args = [key, target];
		if (this instanceof Filter && this.type) {
			// we are chaining, so combine with an and operator
			return this.and(filter);
		}
		return filter;
	}

	protected _createLogicalFilter(type: string, args: Array<Filter | string>): Filter {
		const argsArray = args.map((arg) => {
			return arg instanceof Filter ? arg : new Filter(arg);
		});

		const filter = new Filter();
		filter.type = type;
		filter.args = argsArray;
		if (this.type === type) {
			// chaining, same type
			// combine arguments
			filter.args = this.args.concat(argsArray);
		} else if (this.type) {
			// chaining, different type
			// add this filter to start of arguments
			argsArray.unshift(this);
		} else if (argsArray.length === 1) {
			// not chaining and only one argument
			// returned filter is the same as the single argument
			filter.type = argsArray[0].type;
			filter.args = argsArray[0].args.slice();
		}
		return filter;
	}
	// define our operators
	and(...args: Array<Filter | string>): Filter {
		return this._createLogicalFilter('and', args);
	}
	or(...args: Array<Filter | string>): Filter {
		return this._createLogicalFilter('or', args);
	}
	eq(key: any, value?: any): Filter {
		return this._createFilter(key, value, 'eq');
	}
	ne(key: any, value: any): Filter {
		return this._createFilter(key, value, 'ne');
	}
	lt(key: any, value: any): Filter {
		return this._createFilter(key, value, 'lt');
	}
	lte(key: any, value: any): Filter {
		return this._createFilter(key, value, 'lte');
	}
	gt(key: any, value: any): Filter {
		return this._createFilter(key, value, 'gt');
	}
	gte(key: any, value: any): Filter {
		return this._createFilter(key, value, 'gte');
	}
	contains(key: any, value: any): Filter {
		return this._createFilter(key, value, 'contains');
	}
	'in'(key: any, value: any): Filter {
		return this._createFilter(key, value, 'in');
	}
	match(key: any, value: any): Filter {
		return this._createFilter(key, value, 'match');
	}
};
