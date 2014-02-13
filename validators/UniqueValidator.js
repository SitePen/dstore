define([
	'dojo/_base/declare',
	'dojo/when',
	'../Property'
], function (declare, when, Property) {
	return declare(Property, {
		//	summary:
		//		A validator for enforcing unique values. This will
		//		check a value to see if exists as an id in a store (by 
		//		calling get() on the store), and if get() returns a value,
		//		validation will fail.
		checkForErrors: function (value) {
			var property = this;
			return when(this.inherited(arguments), function (errors) {
				return when(property.uniqueStore.get(value), function (object) {
					if (object) {
						errors.push(property.uniqueError);
					}
					return errors;
				});
			});
		},
		// TODO: Once we define relationships with properties, we may want the
		// store to be coordinated
		//	uniqueStore: Store
		//		The store that will be accessed to determine if a value is unique
		uniqueStore: null,
		//	uniqueError: String
		//		The error message for when the value is not unique
		uniqueError: 'The value is not unique'
	});
});

