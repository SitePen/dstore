define([], function () {
	// TODO: Add documentation
	// TODO: Add QueryMethod tests
	// TODO: Convert to a single argument w/ queryName as the type
	return function QueryMethod(queryName, args) {
		args = args || {};

		return function () {
			// TODO: Test calling log
			// TODO: What is a better name than `log`? `createQueryArgument`?
			var originalArguments = Array.prototype.slice.call(arguments),
				normalizedArguments = args.normalizeArguments
					? args.normalizeArguments.apply(this, originalArguments)
					: originalArguments,
				logEntry = {
					type: queryName,
					arguments: originalArguments,
					normalizedArguments: normalizedArguments
				};

			if (this.queryEngine) {
				// Call the query factory in store context to support things like
				// mapping a string argument for a filter query to a custom filter method on the store
				logEntry.queryer = this.queryEngine[queryName].apply(this, normalizedArguments);
			}

			var newCollection = this._createSubCollection({
				queryLog: this.queryLog.concat(logEntry)
			});

			// TODO: Test calling implementation
			return args.implementation ? args.implementation(logEntry, newCollection) : newCollection;
		};
	};
});
