define([
	'dojo/_base/declare',
	'dojo/_base/lang'
], function (declare, lang) {
	return declare(null, {
		postscript: function () {
			this.inherited(arguments);

			// Instantiating a Tree store should result in a filtered collection, but this is a store.
			// To address this, we create a new object to be the store while this becomes the filtered collection.
			var storeProps = {};
			for (var key in this) {
				if (this.hasOwnProperty(key)) {
					storeProps[key] = this[key];
				}
			}
			var store = lang.delegate(this.constructor.prototype, storeProps);

			var rootFilter = {};
			rootFilter[this.parentProperty] = undefined;
			// TODO: Use excluded properties list to delete properties from this store.
			lang.mixin(this, this.filter(rootFilter), { store: store });
		},

		getChildren: function (object) {
			var filter = {};
			// TODO: Perhaps this should call a getParentProperty() method
			filter[this.parentProperty] = this.getIdentity(object);
			return this.filter(filter);
		},

		mayHaveChildren: function () {
			return true;
		}
	});
});
