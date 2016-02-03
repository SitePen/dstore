define([
	'dojo/_base/declare',
	'./Request',
	'./Cache'
], function(declare, Request, Cache) {
	return declare([ Request, Cache ], {
		postscript: function () {
			this.inherited(arguments);
			if (this.prefetch != false) {
				this.fetch();
			}
		},
		isValidFetchCache: true
	});
});
