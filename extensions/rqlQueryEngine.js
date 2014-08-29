define([
	'dojo/_base/lang',
	'rql/js-array',
	'../objectQueryEngine'
], function (lang, arrayEngine, objectQueryEngine) {
	return lang.delegate(objectQueryEngine, {
		filter: function (filter) {
			return filter.type === 'string'
				? arrayEngine.query(filter.args[0])
				: objectQueryEngine.filter(filter);
		}
	});
});
