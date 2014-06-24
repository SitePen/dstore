define(['dojo/_base/lang', 'dojo/when'], function (lang, when) {
	// TODO: Make this API more extensible, possibly with an options
	function forEach(callback, instance) {
		return when(this, function(data) {
			for (var i = 0, l = data.length; i < l; i++){
				callback.call(instance, data[i], data);
			}
		});
	}
	return function (data, options) {
		var hasTotalLength = options && 'totalLength' in options;
		if(data.then) {
			data = lang.delegate(data);
			var totalLengthPromise = data.then(function (data) {
				return (data.totalLength = hasTotalLength ? options.totalLength :
					data.totalLength || data.length);
			});
			data.totalLength = hasTotalLength ? options.totalLength : totalLengthPromise;
		} else {
			data.totalLength = hasTotalLength ? options.totalLength : data.length;
		}

		data.forEach = forEach;

		return data;
	};
});
