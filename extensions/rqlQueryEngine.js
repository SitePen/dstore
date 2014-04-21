define([
	'dojo/_base/lang',
	'rql/js-array',
	'../objectQueryEngine'
], function (lang, arrayEngine, objectQueryEngine) {
	return lang.delegate(objectQueryEngine, {
		filter: function (filter, options) {
			return typeof filter === 'string'
				? arrayEngine.query(filter, options)
				: objectQueryEngine.filter(filter, options);
		}
	});
});
