define([], function () {
	// TODO: Remove this comment
	// * create log
	// * add queryer based on log
	// * create new collection with updated log and queryer
	// * run store-specific query logic

	// TODO: Convert to a single argument w/ queryName as the type
	return function QueryMethod(queryName, args) {
		args = args || {};

		return function () {
			// TODO: Test calling log
			var logValue = args.log ? args.log.apply(this, arguments) : arguments[0],
				logEntry = {
					type: queryName,
					// TODO: Rename this to `argument`
					value: logValue,
					// TODO: Should the default case be null instead?
					queryer: this.queryEngine
						? this.queryEngine[queryName](logValue)
						: function (data) { return data; }
				},
				newCollection = this._createSubCollection({
					queryLog: this.queryLog.concat([ logEntry ]),
					queryLogTop: logEntry
				});

			// TODO: Test calling implementation
			return args.implementation ? args.implementation(logEntry, newCollection) : newCollection;
		};
	};
});
