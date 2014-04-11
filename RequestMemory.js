define([
	'dojo/_base/declare',
	'./Request',
	'./Cache',
	'./SimpleQuery'
], function(declare, Request, Cache, SimpleQuery) {
	return declare([ Request, Cache ], {
		// summary:
		//		An in-memory store primed by data from an async request

		postscript: function () {
			this.inherited(arguments);
			this.fetch();
		}
	});
});
