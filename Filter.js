define(['dojo/_base/declare'], function (declare) {
	// a Filter builder
	function filterCreator(type) {
		// constructs a new filter based on type, used to create each comparison method
		return function newFilter() {
			var Filter = this.constructor;
			var filter = new Filter();
			filter.type = type;
			// ensure args is array so we can concat, slice, unshift
			filter.args = Array.prototype.slice.call(arguments);
			if (this.type) {
				// we are chaining, so combine with an and operator
				return filterCreator('and').call(Filter.prototype, this, filter);
			}
			return filter;
		};
	}
	function logicalOperatorCreator(type) {
		// constructs a new logical operator 'filter', used to create each logical operation method
		return function newLogicalOperator() {
			var Filter = this.constructor;
			var argsArray = [];
			for (var i = 0; i < arguments.length; i++) {
				var arg = arguments[i];
				argsArray.push(arg instanceof Filter ? arg : new Filter(arg));
			}
			var filter = new Filter();
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
				if (argsArray[0].type) {
					filter.type = argsArray[0].type;
					filter.args = argsArray[0].args.slice();
				}
			}
			return filter;
		};
	}
	var Filter = declare(null, {
		constructor: function (filterArg) {
			var argType = typeof filterArg;
			switch (argType) {
				case 'object':
					var filter = this;
					// construct a filter based on the query object
					for (var key in filterArg){
						var value = filterArg[key];
						if (value instanceof this.constructor) {
							// fully construct the filter from the single arg
							filter = filter[value.type](key, value.args[0]);
						} else if (value && value.test) {
							// support regex
							filter = filter.match(key, value);
						} else {
							filter = filter.eq(key, value);
						}
					}
					this.type = filter.type;
					this.args = filter.args;
					break;
				case 'function': case 'string':
					// allow string and function args as well
					this.type = argType;
					this.args = [filterArg];
			}
		},
		// define our operators
		and: logicalOperatorCreator('and'),
		or: logicalOperatorCreator('or'),
		eq: filterCreator('eq'),
		ne: filterCreator('ne'),
		lt: filterCreator('lt'),
		lte: filterCreator('lte'),
		gt: filterCreator('gt'),
		gte: filterCreator('gte'),
		contains: filterCreator('contains'),
		'in': filterCreator('in'),
		match: filterCreator('match')
	});
	Filter.filterCreator = filterCreator;
	Filter.logicalOperatorCreator = logicalOperatorCreator;
	return Filter;
});
