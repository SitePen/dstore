define([
	'dojo/_base/declare'
	/*=====, 'dstore/Store'=====*/
], function (declare /*=====, Store=====*/) {
	return declare(null, {
		// summary:
		//		A basic mixin for adding hierarchical support to a store,
		//		where children contain a property referencing their parent by ID,
		//		and parents may contain a property indicating whether they have children.

		// parentProperty: String
		//		Name of property to inspect on children for their parent's identifier
		parentProperty: 'parent',

		// hasChildrenProperty: String
		//		Name of property to inspect on items to indicate whether they have children
		hasChildrenProperty: 'hasChildren',

		constructor: function () {
			this.root = this;
		},

		mayHaveChildren: function (object) {
			// summary:
			//		Check if an object may have children
			// description:
			//		This method is useful for eliminating the possibility that an object may have children,
			//		allowing collection consumers to determine things like whether to render UI for child-expansion
			//		and whether a query is necessary to retrieve an object's children.
			// object:
			//		The potential parent
			// returns: boolean

			return this.hasChildrenProperty in object ? object[this.hasChildrenProperty] : true;
		},

		getRootCollection: function () {
			// summary:
			//		Get the collection of objects with no parents
			// returns: dstore/Store.Collection
			return this.getChildren(null);
		},

		getChildren: function (object) {
			// summary:
			//		Get a collection of the children of the provided parent object
			// object:
			//		The parent object
			// returns: dstore/Store.Collection

			var filterObject = {};
			filterObject[this.parentProperty] = object ? this.getIdentity(object) : null;

			return this.root.filter(filterObject);
		}
	});
});
