define([
	'dojo/_base/declare',
	'./Request',
	'./Cache',
	'./SimpleQuery'
], function(declare, Request, Cache, SimpleQuery) {
	return declare([ Request, Cache, SimpleQuery ], {
		postscript: function () {
			this.inherited(arguments);
			this.fetch();
		}
	});
});
