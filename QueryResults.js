define([], function () {
	// TODO: Make this API more extensible, possibly with an options
	return function (data, options) {
		options = options || {};

		data.totalLength = 'totalLength' in options ? options.totalLength : data.length;

		// TODO: Add iteration methods when necessary

		return data;
	};
});
