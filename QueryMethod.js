define([], function () {
	// TODO: Add documentation
	// TODO: Add QueryMethod tests
	// TODO: Convert to a single argument w/ queryName as the type
	return function QueryMethod(queryName, args) {
		args = args || {};

		return function () {
			// TODO: Test calling log
			// TODO: What is a better name than `log`? `createQueryArgument`?
			var queryArgument = args.log ? args.log.apply(this, arguments) : arguments[0],
				logEntry = {
					type: queryName,
					argument: queryArgument,
				};

			if (this.queryEngine) {
				logEntry.queryer = this.queryEngine[queryName](queryArgument);
			}

			var newCollection = this._createSubCollection({
				queryLog: this.queryLog.concat(logEntry)
			});

			// TODO: Test calling implementation
			return args.implementation ? args.implementation(logEntry, newCollection) : newCollection;
		};
	};
});
