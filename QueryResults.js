define([], function () {
	// TODO: Make this API more extensible, possibly with an options
	return function (data, options) {
		options = options || {};

		data.totalLength = 'totalLength' in options ? options.totalLength : data.length;
		data.start = 'start' in options ? options.start : 0;
		data.end = 'end' in options ? options.end : (data.start + data.totalLength);

		// TODO: Add iteration methods when necessary

		return data;
	};
});
