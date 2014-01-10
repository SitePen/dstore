define([
	'dojo/_base/declare',
	'../Property'
], function (declare, Property) {
	return declare(Property, {
		//	summary:
		//		A validator for enforcing numeric values
		checkForErrors: function (value) {
			var errors = this.inherited(arguments);
			if (isNaN(value)) {
				errors.push(this.notANumberError);
			}
			if (this.minimum >= value) {
				errors.push(this.minimumError);
			}
			if (this.maximum <= value) {
				errors.push(this.maximumError);
			}
			return errors;
		},
		//	minimum: Number
		//		The minimum value for the value	
		minimum: -Infinity,
		//	maximum: Number
		//		The maximum value for the value	
		maximum: Infinity,
		//	minimumError: String
		//		The error message for values that are too low
		minimumError: 'The value is too low',
		//	maximumError: String
		//		The error message for values that are too high
		maximumError: 'The value is too high',
		//	notANumberError: String
		//		The error message for values that are not a number
		notANumberError: 'The value is not a number'
	});
});

