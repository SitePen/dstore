define([
	'dojo/_base/declare',
	'./Request',
	'./Cache'
], function (declare, Request, Cache) {
	// module:
	//		dstore/RequestMemory
	return declare([ Request, Cache ], {
		// summary:
		//		A store which makes one request to a server for all of its data, then performs all
		//		operations client-side.  Technically a composition of the Request and Cache stores.

		isValidFetchCache: true,

		postscript: function () {
			this.inherited(arguments);
			this.fetch();
		},

		refresh: function (target) {
			// summary:
			//		Refreshes the store data from the current target or a new target.
			// target: String?
			//		Optional; new target to retrieve data from.  Uses the existing target by default.

			if (this.fetchRequest) {
				// Clear any currently-pending fetch request, since we're about to request again
				this.fetchRequest.cancel();
				this.fetchRequest = null;
			}

			if (target) {
				this.target = target;
			}
			this.invalidate();

			return this.fetch();
		}
	});
});
